/**
 * Isolated content-validation check for `verifyUploadedImage` (H-4).
 *
 * Spawned as a child process (like `jwt-secret-isolated.js`) so `NODE_ENV` and
 * `RACCOON_UPLOAD_ALLOW_UNVERIFIED` can be set without contaminating the
 * in-process Nest tests. It reads only the compiled `uploads/upload.config`
 * module — no Nest app and no Prisma connection run — and writes only to a
 * per-run OS temp `UPLOAD_DIR`, never to `backend/uploads`.
 *
 * Prints one `name=result` line per case, consumed by `test/security.e2e.js`.
 * Run directly with:  node test/upload-validation-isolated.js
 */

'use strict';

// Production defaults: the escape hatch must NOT be available here.
delete process.env.RACCOON_UPLOAD_ALLOW_UNVERIFIED;
process.env.NODE_ENV = 'production';

// Isolated scratch directory: the validator renames the staged file on disk, so
// this test needs a real (temporary) filesystem location, never backend/uploads.
const fs = require('fs');
const os = require('os');
const path = require('path');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'raccoon-upload-validation-'));
process.env.UPLOAD_DIR = SCRATCH;

const CONFIG_PATH = require.resolve('../dist/uploads/upload.config');

/** Minimal but structurally complete 1x1 JPEG (SOI marker … EOI marker). */
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);
// PNG signature followed immediately by the IEND chunk, which is what the
// validator requires (signature present AND stream terminated correctly).
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('IEND', 'latin1'),
  Buffer.from([0xae, 0x42, 0x60, 0x82]),
]);
// GIF header followed by the stream trailer byte.
const GIF = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([0x3b])]);

let counter = 0;
/**
 * Build a multer-shaped file staged on disk under the name `imageUploadInterceptor`
 * would produce. `verifyUploadedImage` renames it, so the file must really exist.
 */
function staged(content, { mimetype, originalname }) {
  counter += 1;
  const filename = `wall-${Date.now()}-${counter}.upload`;
  const filePath = path.join(SCRATCH, filename);
  fs.writeFileSync(filePath, content);
  return {
    fieldname: 'image',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer: content,
    size: content.length,
    filename,
    destination: SCRATCH,
    path: filePath,
  };
}

function capture(fn) {
  try {
    fn();
    return 'ok';
  } catch (e) {
    // Nest's BadRequestException exposes getStatus() === 400.
    const status = typeof e?.getStatus === 'function' ? e.getStatus() : undefined;
    return status === 400 ? 'rejected' : `FAIL(${e && e.message})`;
  }
}

function check() {
  const { verifyUploadedImage } = require(CONFIG_PATH);
  const out = [];
  const expectRejected = (label, file) =>
    out.push(`${label}=${capture(() => verifyUploadedImage(file, 'wall')) === 'rejected' ? 'rejected' : 'FAIL'}`);

  // 1. A genuine JPEG is accepted and canonicalised to .jpg.
  const okJpeg = staged(JPEG, { mimetype: 'image/jpeg', originalname: 'photo.jpeg' });
  const verified = capture(() => verifyUploadedImage(okJpeg, 'wall'));
  out.push(`valid-jpeg=${verified === 'ok' ? 'ok' : verified}`);
  out.push(`valid-jpeg-canonical-ext=${okJpeg.filename.endsWith('.jpg') ? 'ok' : 'FAIL'}`);
  out.push(`valid-jpeg-mime=${okJpeg.mimetype === 'image/jpeg' ? 'ok' : 'FAIL'}`);
  // The bytes must actually be reachable under the canonical name on disk.
  out.push(
    `valid-jpeg-renamed-on-disk=${fs.existsSync(path.join(SCRATCH, okJpeg.filename)) ? 'ok' : 'FAIL'}`,
  );

  // 2. Genuine PNG / GIF bytes are accepted.
  out.push(
    `valid-png=${capture(() => verifyUploadedImage(staged(PNG, { mimetype: 'image/png', originalname: 'a.png' }), 'wall')) === 'ok' ? 'ok' : 'FAIL'}`,
  );
  out.push(
    `valid-gif=${capture(() => verifyUploadedImage(staged(GIF, { mimetype: 'image/gif', originalname: 'a.gif' }), 'wall')) === 'ok' ? 'ok' : 'FAIL'}`,
  );

  // 3. HTML disguised as a PNG (the H-4 attack case).
  expectRejected(
    'spoofed-html-as-png',
    staged(Buffer.from('<html><script>alert(1)</script></html>'), {
      mimetype: 'image/png',
      originalname: 'payload.png',
    }),
  );

  // 4. Real JPEG bytes with a contradicting extension.
  expectRejected(
    'jpeg-bytes-svg-name',
    staged(JPEG, { mimetype: 'image/jpeg', originalname: 'evil.svg' }),
  );

  // 5. Real JPEG bytes with a contradicting declared Content-Type.
  expectRejected(
    'jpeg-bytes-declared-png',
    staged(JPEG, { mimetype: 'image/png', originalname: 'photo.jpg' }),
  );

  // 6. Truncated JPEG (valid header, no EOI marker).
  expectRejected(
    'truncated-jpeg',
    staged(JPEG.subarray(0, 20), { mimetype: 'image/jpeg', originalname: 'photo.jpg' }),
  );

  // 7. Empty body.
  expectRejected(
    'empty-file',
    staged(Buffer.alloc(0), { mimetype: 'image/jpeg', originalname: 'photo.jpg' }),
  );

  // 8. Fail closed when the route did not stage the file.
  const unstaged = staged(JPEG, { mimetype: 'image/jpeg', originalname: 'photo.jpg' });
  unstaged.filename = 'attacker-chosen.jpg';
  expectRejected('unstaged-filename', unstaged);

  // 9. The production escape hatch is inert even when the env var is present.
  process.env.RACCOON_UPLOAD_ALLOW_UNVERIFIED = '1';
  delete require.cache[CONFIG_PATH];
  const fresh = require(CONFIG_PATH);
  const relaxedAttempt = capture(() =>
    fresh.verifyUploadedImage(
      (() => {
        const f = staged(Buffer.from('not-an-image'), { mimetype: 'image/jpeg', originalname: 'photo.jpg' });
        return f;
      })(),
      'wall',
      { relaxInNonProduction: true },
    ),
  );
  out.push(`prod-ignores-escape-hatch=${relaxedAttempt === 'rejected' ? 'rejected' : 'FAIL'}`);
  delete process.env.RACCOON_UPLOAD_ALLOW_UNVERIFIED;

  return out;
}

try {
  const lines = check();
  console.log(lines.join('\n'));
  fs.rmSync(SCRATCH, { recursive: true, force: true });
} catch (e) {
  console.log(`harness=FAIL(${e && e.message})`);
  fs.rmSync(SCRATCH, { recursive: true, force: true });
  process.exit(1);
}
