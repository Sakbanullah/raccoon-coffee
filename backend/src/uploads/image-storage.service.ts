import { Injectable, Logger } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { UPLOAD_DIR, uploadedFilenamePattern } from './upload.config';

/** Injection token for the active storage provider. */
export const IMAGE_STORAGE = 'IMAGE_STORAGE';

/**
 * Result of storing an uploaded image.
 *
 * `url` is the public path to persist in the database. `filename` is the
 * provider-owned file name, used later for best-effort deletion.
 */
export interface StoredImage {
  url: string;
  filename: string;
}

/**
 * Storage boundary for uploaded images.
 *
 * The rest of the application depends only on `store` / `removeIfOwned`, never
 * on multer or the filesystem. A future object-storage provider (Cloudinary,
 * S3, ...) can replace the local implementation without changing the site-image
 * API contract, because callers only ever see a public URL.
 */
export interface ImageStorage {
  /**
   * Persist an already-accepted upload and return its public URL.
   * `prefix` namespaces the filename per feature, as the existing upload
   * config does for `wall` and `product`.
   */
  store(file: Express.Multer.File, prefix: string): StoredImage;

  /**
   * Delete a previously stored file, but only when this provider is confirmed
   * to own it and no other database record still references it.
   * Best-effort: missing files and foreign URLs are ignored.
   */
  removeIfOwned(
    url: string,
    prefix: string,
    referencedElsewhere?: boolean,
    servePath?: string,
  ): Promise<boolean>;
}

/**
 * Local disk storage. This is the active provider.
 *
 * Files are already written to disk by the multer interceptor
 * (`imageUploadInterceptor`) before this service runs, so `store` only computes
 * the public URL. URL shapes are unchanged from the existing implementation:
 * uploads are served from `<servePath>/<filename>` on this backend.
 */
@Injectable()
export class LocalDiskImageStorage implements ImageStorage {
  private readonly logger = new Logger(LocalDiskImageStorage.name);

  store(file: Express.Multer.File, _prefix: string): StoredImage {
    return { url: this.publicUrl(file.filename), filename: file.filename };
  }

  /**
   * Build the public URL for a file name. `prefix` is not needed for the URL
   * because the serving route identifies the namespace.
   */
  publicUrl(filename: string, servePath = '/api/site-images/uploads'): string {
    return `${servePath}/${filename}`;
  }

  async removeIfOwned(
    url: string,
    prefix: string,
    referencedElsewhere = false,
    servePath?: string,
  ): Promise<boolean> {
    if (referencedElsewhere) return false;

    const filename = servePath
      ? this.ownedFilename(url, prefix, servePath)
      : this.ownedFilename(url, prefix);
    if (!filename) return false;

    await unlink(join(UPLOAD_DIR, filename)).catch((error: NodeJS.ErrnoException) => {
      // A missing file must not surface as an error: the owning DB record is
      // already gone, so there is nothing left to reconcile.
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`Could not delete stored image ${filename}: ${error?.code ?? 'unknown'}`);
      }
    });
    return true;
  }

  /**
   * Resolve a URL to an owned file name, or `null` when the URL is not a
   * locally served upload for this feature.
   *
   * Only paths served by this provider are eligible. Static frontend assets
   * (`/images/...`) and external URLs are never owned, which protects
   * `frontend/public` and third-party assets from deletion.
   */
  ownedFilename(url: string, prefix: string, servePath = '/api/site-images/uploads/'): string | null {
    if (typeof url !== 'string' || !url.startsWith(servePath)) return null;

    const filename = url.slice(servePath.length);
    // Reject nested paths and anything not matching the generated pattern.
    if (filename.includes('/')) return null;
    if (!uploadedFilenamePattern(prefix).test(filename)) return null;

    return filename;
  }
}
