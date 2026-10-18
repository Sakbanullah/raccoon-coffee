import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterError, diskStorage, type Options as MulterOptions } from 'multer';
import { mkdirSync, readFileSync, renameSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Observable, catchError, concatMap, from, throwError } from 'rxjs';

// Overridable so tests can use a temp dir instead of the real uploads folder.
// Resolved to an absolute path at load (M-7): a relative value would otherwise
// depend on the process working directory, so the process that writes a file
// and the process that serves it could disagree.
export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || './uploads');

/** Server-side image size limit (5MB). Mirrored by the frontend hint. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Formats actually usable by this application.
 *
 * The frontend only ever sends `image/jpeg`, `image/png`, `image/gif`
 * (`app/admin/products/page.tsx`, `app/admin/site-images/page.tsx`,
 * `components/ui/file-upload-card.tsx`), so the accepted set is unchanged by the
 * content-validation fix.
 *
 * SVG is deliberately **not** accepted: it is an XML document that can carry
 * scripts. The upload routes serve files from the API origin and the frontend
 * allows SVG through its image optimizer (`next.config.js`
 * `dangerouslyAllowSVG: true`), so accepting SVG here would be stored XSS.
 */
export interface AllowedImageFormat {
  /** Canonical MIME type reported to the client and stored in the database. */
  mime: string;
  /** Canonical filename extension used for the stored file and the served URL. */
  ext: string;
  /** Extra extensions that must map to this format when uploaded as `mime`. */
  altExts: string[];
  /** True when the bytes match this format. */
  matches: (buffer: Buffer) => boolean;
  /** True when the file is truncated / corrupt (first block present, format incomplete). */
  truncated: (buffer: Buffer) => boolean;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IEND_CHUNK = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

const GIF_SIGNATURES = ['GIF87a', 'GIF89a'];

const IMAGE_FORMATS: AllowedImageFormat[] = [
  {
    mime: 'image/jpeg',
    ext: '.jpg',
    altExts: ['.jpeg', '.jpe', '.jfif'],
    // Start Of Image marker.
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    // End Of Image marker is required for a complete JPEG.
    truncated: (b) => !(b.length >= 2 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9),
  },
  {
    mime: 'image/png',
    ext: '.png',
    altExts: [],
    matches: (b) => b.length >= PNG_SIGNATURE.length && b.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
    // A complete PNG always ends with the IEND chunk.
    truncated: (b) => b.length < IEND_CHUNK.length || !b.subarray(b.length - IEND_CHUNK.length).equals(IEND_CHUNK),
  },
  {
    mime: 'image/gif',
    ext: '.gif',
    altExts: [],
    matches: (b) => b.length >= 6 && GIF_SIGNATURES.includes(b.subarray(0, 6).toString('latin1')),
    // Trailer byte 0x3B closes a GIF stream.
    truncated: (b) => b[b.length - 1] !== 0x3b,
  },
];

/**
 * Formats accepted **outside production** so the existing security e2e suite
 * (`backend/test/security.e2e.js`) can keep uploading placeholder bytes without
 * having to embed whole image files in the test. Production never enables this.
 */
const TEST_FORMAT: AllowedImageFormat = {
  mime: 'image/vnd.raccoon-test',
  ext: '.jpg',
  altExts: [],
  matches: () => true,
  truncated: () => false,
};

/** Requested `Content-Type` values accepted per canonical MIME type. */
const ACCEPTED_REQUEST_MIME: Record<string, string[]> = {
  'image/jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  'image/png': ['image/png'],
  'image/gif': ['image/gif'],
};

export function isUploadContentValidationRelaxed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.RACCOON_UPLOAD_ALLOW_UNVERIFIED === '1';
}

/** Canonical extension for a stored filename, derived from verified content. */
function canonicalExtensionForMime(mime: string): string {
  return IMAGE_FORMATS.find((format) => format.mime === mime)?.ext ?? '.jpg';
}

/** `<prefix>-<timestamp>-<random>.upload` staging name produced by `imageUploadInterceptor`. */
const STAGING_FILENAME = /^(\d+-\d+)\.upload$/;

/**
 * Staging files owned by uploads that are still in flight. The reaper must never
 * delete one of these: a slow or paused client can leave an old mtime on a file
 * that the request still owns.
 *
 * There is deliberately no time-based expiry: an upload may legitimately take
 * longer than the reaper's age threshold, and expiring its marker would let the
 * reaper delete a file the request is still using. Entries are released when the
 * request finishes, fails, or aborts (response `close`), so none leak.
 */
const activeStagingFiles = new Set<string>();

/** Mark a staging file as owned by an in-flight upload. */
export function registerStagingFile(path: string): void {
  activeStagingFiles.add(resolve(path));
}

/** Drop the in-flight marker once the upload finished (stored or discarded). */
export function releaseStagingFile(path: string): void {
  activeStagingFiles.delete(resolve(path));
}

/** True while the staging file belongs to a request that may still be using it. */
export function isStagingFileActive(path: string): boolean {
  return activeStagingFiles.has(resolve(path));
}

/**
 * Register a staging file and release it when the response closes. `close` fires
 * after a normal response and when the client aborts, so an aborted upload does
 * not pin its staging file.
 *
 * A response that is already destroyed will never emit `close` again, so the
 * marker is released immediately instead of pinning the file forever.
 */
export function trackStagingFile(
  path: string,
  response?: { once(event: 'close', listener: () => void): unknown; destroyed?: boolean },
): void {
  registerStagingFile(path);
  if (!response) return;
  if (response.destroyed) {
    releaseStagingFile(path);
    return;
  }
  response.once('close', () => releaseStagingFile(path));
}


/**
 * Allowlist for the generated `<prefix>-<timestamp>-<random>.<ext>` filenames.
 * Anything else is rejected, which also blocks path traversal. It is also the
 * single source of truth for the extensions an upload URL may carry, so the
 * write path (`verifyUploadedImage`) and the serve paths cannot drift apart.
 */
export function uploadedFilenamePattern(prefix: string): RegExp {
  const extensions = IMAGE_FORMATS.map((format) => format.ext.slice(1)).join('|');
  return new RegExp(`^${prefix}-\\d+-\\d+\\.(${extensions})$`, 'i');
}

/**
 * Delete an uploaded file that was written to disk but is not going to be kept,
 * so a rejected or failed upload never leaves an orphan in permanent storage.
 * Best-effort: a missing file is not an error.
 */
export async function discardStoredUpload(file: Express.Multer.File | undefined): Promise<void> {
  if (!file) return;
  const target = file.path || (file.filename ? join(resolve(UPLOAD_DIR), file.filename) : undefined);
  if (!target) return;
  releaseStagingFile(target);
  const { unlink } = await import('fs/promises');
  await unlink(target).catch(() => undefined);
}

/**
 * Validate the **actual bytes** of an uploaded image (magic-byte signature, plus
 * an explicit "the file ends where the format ends" check so a transfer that was
 * cut short cannot be stored), and reconcile them with the client-supplied
 * filename extension and `Content-Type`.
 *
 * On success the file carries a **server-derived** filename extension and MIME
 * type; the client values are never trusted for storage or serving. On failure a
 * controlled `BadRequestException` is thrown whose message contains no file
 * path, no filesystem detail, and no stack trace (Nest logs the exception
 * server-side and returns a generic error body).
 */
export function verifyUploadedImage(
  file: Express.Multer.File,
  prefix: string,
  options: { relaxInNonProduction?: boolean } = {},
): Express.Multer.File {
  // The interceptor must have staged this upload under its own
  // `<prefix>-<timestamp>-<random>.upload` name. Anything else means the route
  // is (mis)configured, so fail closed rather than trust the incoming filename.
  const stagingPrefix = `${prefix}-`;
  const stagedName = file.filename ?? '';
  const staged = stagedName.startsWith(stagingPrefix)
    ? STAGING_FILENAME.exec(stagedName.slice(stagingPrefix.length))
    : null;
  if (!staged) {
    throw new BadRequestException('Uploaded file could not be stored safely.');
  }

  let buffer: Buffer;
  try {
    // Multer's diskStorage writes the file to disk and does not populate `buffer`.
    buffer = file.buffer ?? readFileSync(file.path);
  } catch {
    throw new BadRequestException('The uploaded file is empty or unreadable.');
  }
  if (buffer.length === 0) {
    throw new BadRequestException('The uploaded file is empty or unreadable.');
  }

  // diskStorage (used by every HTTP route) has no `buffer`; never relax validation
  // for a staged file read from disk, even when the test-only flag is present.
  const relaxed = options.relaxInNonProduction === true && file.buffer !== undefined && isUploadContentValidationRelaxed();
  const candidates = relaxed ? [TEST_FORMAT, ...IMAGE_FORMATS] : IMAGE_FORMATS;
  const detected = candidates.find((format) => format.matches(buffer));

  if (!detected) {
    throw new BadRequestException(
      'Unsupported file content: the uploaded file is not a valid JPG, PNG, or GIF image.',
    );
  }

  const declaredMime = (file.mimetype || '').toLowerCase();
  const acceptedMimes = ACCEPTED_REQUEST_MIME[detected.mime];
  if (acceptedMimes && !acceptedMimes.includes(declaredMime)) {
    throw new BadRequestException('The file content does not match the declared content type.');
  }

  // A missing extension is tolerated (browsers/curl may omit it); a *wrong*
  // extension is rejected, because it would produce a URL whose extension
  // disagrees with the bytes being served. SVG and other active formats land
  // here, so they can never be stored even if their bytes were ever accepted.
  const requestedExtension = extname(file.originalname || '').toLowerCase();
  const allowedExtensions = [detected.ext, ...detected.altExts];
  if (requestedExtension && !allowedExtensions.includes(requestedExtension)) {
    throw new BadRequestException('The file content does not match the file extension.');
  }

  if (detected.truncated(buffer)) {
    throw new BadRequestException('The uploaded image is incomplete or corrupt.');
  }

  // Commit the server-derived name for the bytes that were just verified. The
  // extension (and therefore the Content-Type served later) comes from the
  // content, never from the client.
  const canonicalFilename = `${prefix}-${staged[1]}${canonicalExtensionForMime(detected.mime)}`;

  // The staging file is still on disk under its `.upload` name, so rename it to
  // match the URL that is about to be registered. Both names are generated
  // server-side, so this cannot escape UPLOAD_DIR.
  const uploadDir = resolve(UPLOAD_DIR);
  const stagedPath = file.path || join(uploadDir, stagedName);
  const finalPath = join(uploadDir, canonicalFilename);
  try {
    renameSync(stagedPath, finalPath);
  } catch {
    // The rename failed (e.g. the staged file vanished): nothing usable is left,
    // so report a controlled error instead of registering a broken URL.
    throw new BadRequestException('The uploaded image could not be stored.');
  } finally {
    // The upload no longer owns a staging name, so the reaper may take it.
    releaseStagingFile(stagedPath);
  }

  file.filename = canonicalFilename;
  file.path = finalPath;
  file.destination = uploadDir;
  file.mimetype = detected.mime;
  return file;
}

/**
 * Client-safe message per multer limit code.
 *
 * Nest's `FileInterceptor` translates the older multer messages itself, but
 * multer 2.x added `LIMIT_FIELD_NESTING` (and others) that it does not know.
 * Those reached the client as a generic 500. The mapping lives here, at the
 * upload boundary, so it does not depend on a separately registered global
 * exception filter being present in the running build.
 */
const MULTER_LIMIT_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'The uploaded file is too large.',
  LIMIT_FILE_COUNT: 'Too many files were uploaded.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
  LIMIT_PART_COUNT: 'Too many multipart parts.',
  LIMIT_FIELD_COUNT: 'Too many form fields.',
  LIMIT_FIELD_KEY: 'A form field name is too long.',
  LIMIT_FIELD_VALUE: 'A form field value is too long.',
  LIMIT_FIELD_NESTING: 'Field name nesting is too deep.',
  LIMIT_FIELD_ARRAY_INDEX: 'A form field array index is too large.',
  MISSING_FIELD_NAME: 'A form field name is missing.',
  INVALID_FIELD_NAME: 'A form field name is invalid.',
  STREAM_DESTROYED: 'The upload stream was interrupted.',
};

/** Turn a multer limit error into an `HttpException`; anything else passes through. */
function toUploadHttpException(error: unknown): unknown {
  if (!(error instanceof MulterError)) return error;
  // `@types/multer` predates the newer codes, so compare the runtime value as a string.
  const code = String(error.code);
  const message = MULTER_LIMIT_MESSAGES[code] ?? 'Invalid multipart upload.';
  return code === 'LIMIT_FILE_SIZE'
    ? new PayloadTooLargeException(message)
    : new BadRequestException(message);
}

/**
 * Shared upload config for single image files.
 *
 * `prefix` namespaces stored filenames so each feature (Raccoon Wall, product
 * images, site images) owns its own files without touching the other's records.
 * Reusing this keeps storage location, size limit, and content validation
 * identical on every upload route.
 *
 * Files are first written to `UPLOAD_DIR` by multer under a staging name
 * (`<prefix>-<timestamp>-<random>.upload`), then validated on their **content**
 * by `imageContentValidationInterceptor` (see `verifyUploadedImage`), which
 * renames the file to its canonical, server-derived name. A file that fails
 * validation is unlinked, so nothing unvalidated survives in storage. The multer
 * `fileFilter` remains as a cheap first pass: it stops a declared non-image
 * before a 5 MB buffer is allocated, and it is never the only check.
 */
export function imageUploadInterceptor(prefix: string) {
  // Fail fast (and readably) when the upload directory is missing, so a storage
  // misconfiguration surfaces at startup instead of as a 500 on the first
  // request. This also keeps serving and writing on the same resolved path.
  const uploadDir = resolve(UPLOAD_DIR);
  mkdirSync(uploadDir, { recursive: true });

  // Typed against multer itself: Nest's MulterOptions.limits predates
  // `fieldNestingDepth`, but the option is passed through to busboy at runtime.
  const limits: MulterOptions['limits'] = {
    fileSize: IMAGE_MAX_BYTES,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldNestingDepth: 2,
    parts: 20,
  };

  const UploadInterceptor = FileInterceptor('image', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Staging extension only: `verifyUploadedImage` replaces it with the
        // canonical extension for the content it actually detected.
        const stagedName = `${prefix}-${uniqueSuffix}.upload`;
        // Claim the file before it is written so the reaper cannot delete an
        // upload that is still in flight. The response `close` handler releases
        // the claim on success, failure, and client abort.
        trackStagingFile(join(uploadDir, stagedName), req.res);
        callback(null, stagedName);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!(file.mimetype in ACCEPTED_REQUEST_MIME)) {
        return callback(new BadRequestException('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits,
  });

  // Multer raises its limit errors inside the middleware callback, and Nest's
  // own translation only knows the older codes. Convert them here so every
  // multipart limit (including `LIMIT_FIELD_NESTING`) answers 400/413 instead of
  // an unhandled 500. No stack trace or client-supplied field name is exposed.
  class UploadLimitInterceptor extends UploadInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      try {
        return await super.intercept(context, next);
      } catch (error) {
        throw toUploadHttpException(error);
      }
    }
  }

  return UploadLimitInterceptor;
}

/**
 * Content-validation stage for an upload route.
 *
 * Nest runs interceptors in declaration order, so this must be declared after
 * `imageUploadInterceptor(prefix)`:
 *
 * ```ts
 * @UseInterceptors(imageUploadInterceptor('wall'), imageContentValidationInterceptor('wall'))
 * ```
 *
 * It inspects the staged file's bytes, rejects malformed/unsupported/mismatched
 * uploads with a controlled `BadRequestException`, and unlinks the staged file
 * when validation fails so a rejected upload never keeps the slot (or the disk
 * space) it briefly occupied.
 */
export function imageContentValidationInterceptor(prefix: string) {
  return new ContentValidationInterceptor(prefix);
}

@Injectable()
class ContentValidationInterceptor implements NestInterceptor {
  constructor(private readonly prefix: string) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ file?: Express.Multer.File }>();
    const file = request.file;

    if (file) {
      try {
        // `relaxInNonProduction` keeps the non-production escape hatch available
        // for the security e2e suite; it is a no-op when NODE_ENV is production.
        verifyUploadedImage(file, this.prefix, { relaxInNonProduction: true });
      } catch (error) {
        // Discard first, then rethrow: the caller must see the validation error
        // even if the unlink itself fails (it is best-effort by design).
        await discardStoredUpload(file);
        throw error;
      }
    }

    // The handler may still fail (e.g. a database error). A file that was
    // written but never registered must not be left behind, so clean it up here
    // too. `discardStoredUpload` is best-effort and silent on ENOENT.
    return next.handle().pipe(
      catchError((error) =>
        from(discardStoredUpload(file)).pipe(concatMap(() => throwError(() => error))),
      ),
    );
  }
}

/** Every extension `uploadedFilenamePattern` can accept, for URL validation. */
export const ALLOWED_IMAGE_EXTENSIONS = IMAGE_FORMATS.map((format) => format.ext.slice(1));
