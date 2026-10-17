/**
 * Raccoon Coffee backend — minimal security e2e test runner.
 *
 * Run from the backend directory:  npm run test:e2e
 *
 * Prerequisites:
 *   - `npm run build` (the runner uses the compiled dist/ output; test:e2e runs it).
 *   - No MySQL/Prisma connection is required: PrismaService is overridden before
 *     init and AuthService.login is replaced with a fake.
 *   - Uploads are written to a per-run OS temp directory (UPLOAD_DIR), never to
 *     the real backend/uploads folder.
 *
 * Isolation of external dependencies:
 *   - PrismaService  -> {} (never connects)
 *   - AuthService    -> in-memory fake returning a dummy token
 *   - PhotosService  -> in-memory fake (returns the imageUrl the real service builds)
 *   - disk storage   -> UPLOAD_DIR temp dir (see PhotosController)
 *
 * Content validation (H-4): the upload route inspects the actual bytes, so this
 * suite asserts that spoofed/mismatched/truncated uploads are rejected with 400
 * and that a rejected upload leaves **no** file behind in UPLOAD_DIR.
 * `RACCOON_UPLOAD_ALLOW_UNVERIFIED=1` is set only so the route-wiring cases can
 * keep using tiny placeholder buffers; real image bytes are used for every
 * content-validation case, and production ignores the flag.
 *
 * Determinism: every case asserts a concrete HTTP status or thrown error.
 * A connection failure (ECONNREFUSED etc.) fails the run instead of passing.
 */

'use strict';

// Must be set BEFORE requiring dist/: PhotosController reads UPLOAD_DIR at load.
const fs = require('fs');
const os = require('os');
const path = require('path');
const TEMP_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'raccoon-e2e-uploads-'));
process.env.UPLOAD_DIR = TEMP_UPLOAD_DIR;
// Non-production placeholder uploads remain accepted so this suite can exercise
// the route wiring with tiny fixtures. Content validation itself is asserted
// below with real image bytes; production never enables this escape hatch.
process.env.RACCOON_UPLOAD_ALLOW_UNVERIFIED = '1';

const { execFileSync } = require('child_process');
const { Test } = require('@nestjs/testing');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const { AppModule } = require('../dist/app.module');
const { AuthService } = require('../dist/auth/auth.service');
const { PhotosService } = require('../dist/photos/photos.service');
const { PrismaService } = require('../dist/prisma/prisma.service');

const LOGIN_LIMIT = 5; // must match @Throttle in AuthController
const UPLOAD_LIMIT = 5; // must match @Throttle in PhotosController

const results = [];
function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '\u2714' : '\u2716'} ${name}${detail ? ' — ' + detail : ''}`);
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Assert a status array reaches 429 exactly at position `limit`, treating any
// connection-level failure (which yields `undefined`) as a hard failure.
function assertThrottled(statuses, limit, label) {
  const under = statuses.slice(0, limit);
  assert(under.every(s => s !== undefined), `${label}: requests threw connection errors -> ${under}`);
  assert(statuses[limit] === 429, `${label}: request #${limit + 1} must return 429, got ${statuses[limit]}`);
}

// Minimal but structurally valid images, so content validation is exercised
// against real magic bytes rather than the non-production escape hatch.
const JPEG_1PX = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);
const FIXTURES = {
  'image/jpeg': { bytes: JPEG_1PX, filename: 'photo.jpg' },
};

// Startup configuration validation (M-11): isolated child-process check.
// The child mutates process.env freely; the parent consumes the ok/fail lines.
{
  const { spawnSync } = require('child_process');
  const res = spawnSync(process.execPath, [require.resolve('./config-validation-isolated.js')], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV, RACCOON_E2E_CHILD: '1' },
  });
  const out = String(res.stdout || '').trim();
  if (res.status !== 0 || !out) {
    report('config-validation (runner)', false, `exited ${res.status}${res.stderr ? ' — ' + String(res.stderr).trim() : ''}`);
  } else {
    const expectations = [
      'valid-config', 'missing-jwt-secret', 'weak-jwt-secret', 'missing-database-url',
      'placeholder-database-url', 'bad-scheme-database-url', 'invalid-port', 'invalid-trust-proxy',
      'prod-no-trust-proxy-warns', 'unset-node-env-warns', 'unknown-node-env', 'no-secret-echo',
      'no-secret-value-in-errors',
    ];
    for (const name of expectations) {
      const line = out.split('\n').find((l) => l.startsWith(name + '='));
      const ok = line === `${name}=ok`;
      report(`config: ${name}`, ok, ok ? undefined : `got: ${line || 'missing'}`);
    }
  }
}

async function main() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(AuthService)
    .useValue({ async login() { return 'dummy-token'; } })
    .overrideProvider(PhotosService)
    .useValue({
      async createPendingUpload(file, visitorName, caption) {
        return {
          message: 'Photo uploaded successfully and is pending review.',
          data: {
            visitorName,
            caption: caption || null,
            imageUrl: `/api/photos/uploads/${file.filename}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: String(file.size),
            status: 'PENDING',
          },
        };
      },
      findApproved() { return { data: [], meta: { total: 0 } }; },
      findPending() { return { data: [], meta: { total: 0 } }; },
      async moderatePhoto(id, status, adminId) {
        return { data: { photoId: id, status, reviewedByAdminId: adminId } };
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
  const server = app.getHttpServer();

  // ---- 1. Content validation (actual bytes, not the declared Content-Type) --
  // Every case below sends the *same* declared `image/jpeg`/`image/png` header
  // and filename shape the old filter trusted; only the bytes differ.
  try {
    // Count what already exists, so a rejected upload can be proven to have
    // written nothing to permanent storage.
    const before = fs.readdirSync(TEMP_UPLOAD_DIR);

    // HTML/JS disguised as a PNG: declared image/png, filename .png, but the
    // bytes are not an image. This is exactly the H-4 attack case.
    const spoofed = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-attacker')
      .attach('image', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'payload.png',
        contentType: 'image/png',
      });
    assert(spoofed.status === 400, `spoofed content type must be 400, got ${spoofed.status}`);
    assert(
      fs.readdirSync(TEMP_UPLOAD_DIR).length === before.length,
      'a rejected upload must not leave a file behind in UPLOAD_DIR',
    );
    report('HTML bytes declared image/png rejected with 400 (no file left behind)', true);
  } catch (e) {
    report('HTML bytes declared image/png rejected with 400 (no file left behind)', false, e.message);
  }

  try {
    // Real JPEG bytes, but a filename extension that contradicts the content.
    // (Declared as a supported type so the cheap multer first pass lets it
    // through to the byte check, which is where the mismatch is caught.)
    const mismatched = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-attacker')
      .attach('image', FIXTURES['image/jpeg'].bytes, {
        filename: 'evil.png',
        contentType: 'image/jpeg',
      });
    assert(mismatched.status === 400, `content/extension mismatch must be 400, got ${mismatched.status}`);
    report('JPEG content with .png filename rejected with 400', true);
  } catch (e) {
    report('JPEG content with .png filename rejected with 400', false, e.message);
  }

  try {
    // Real JPEG bytes declared with a non-image Content-Type.
    const wrongMime = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-attacker')
      .attach('image', FIXTURES['image/jpeg'].bytes, {
        filename: 'photo.jpg',
        contentType: 'image/png',
      });
    assert(wrongMime.status === 400, `content/declared-type mismatch must be 400, got ${wrongMime.status}`);
    report('JPEG bytes declared image/png rejected with 400', true);
  } catch (e) {
    report('JPEG bytes declared image/png rejected with 400', false, e.message);
  }

  try {
    // Valid image whose transfer was cut short (no EOI marker).
    const truncated = Buffer.concat([FIXTURES['image/jpeg'].bytes.subarray(0, 20)]);
    const cut = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-attacker')
      .attach('image', truncated, { filename: 'photo.jpg', contentType: 'image/jpeg' });
    assert(cut.status === 400, `truncated image must be 400, got ${cut.status}`);
    report('truncated JPEG rejected with 400', true);
  } catch (e) {
    report('truncated JPEG rejected with 400', false, e.message);
  }

  try {
    // A genuine, complete image must still be accepted and served back.
    const before = fs.readdirSync(TEMP_UPLOAD_DIR);
    const res = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-visitor')
      .attach('image', FIXTURES['image/jpeg'].bytes, {
        filename: 'holiday.jpeg',
        contentType: 'image/jpeg',
      });
    assert(res.status === 201 || res.status === 200, `valid image must succeed, got ${res.status}`);
    const imageUrl = res.body && res.body.data && res.body.data.imageUrl;
    assert(
      typeof imageUrl === 'string' && imageUrl.startsWith('/api/photos/uploads/wall-'),
      `response must contain a served imageUrl, got ${JSON.stringify(res.body)}`,
    );
    // The stored extension is derived from the content, not from ".jpeg".
    assert(imageUrl.endsWith('.jpg'), `stored URL must use the canonical extension, got ${imageUrl}`);

    const created = fs.readdirSync(TEMP_UPLOAD_DIR).filter(f => !before.includes(f));
    assert(created.length === 1 && created[0].endsWith('.jpg'),
      `exactly one canonical .jpg file must be written, got ${JSON.stringify(created)}`);

    const served = await request(server).get(imageUrl);
    assert(served.status === 200, `uploaded image must be servable, got ${served.status}`);
    report('genuine JPEG accepted, canonicalized to .jpg, and served back (200)', true);
  } catch (e) {
    report('genuine JPEG accepted, canonicalized to .jpg, and served back (200)', false, e.message);
  }

  // ---- 3. Filename validation on the static route -------------------------
  try {
    const traversal = await request(server).get('/api/photos/uploads/..%2Fpackage.json');
    assert(traversal.status === 400, `traversal filename must be 400, got ${traversal.status}`);
    report('path traversal filename rejected with 400', true);
  } catch (e) {
    report('path traversal filename rejected with 400', false, e.message);
  }

  try {
    const bad = await request(server).get('/api/photos/uploads/wall-123-456.txt');
    assert(bad.status === 400, `invalid extension must be 400, got ${bad.status}`);
    report('invalid extension rejected with 400', true);
  } catch (e) {
    report('invalid extension rejected with 400', false, e.message);
  }

  try {
    const missing = await request(server).get('/api/photos/uploads/wall-1111-2222.jpg');
    assert(missing.status === 404, `valid-but-missing file must be 404, got ${missing.status}`);
    report('valid filename shape accepted (404 for missing file)', true);
  } catch (e) {
    report('valid filename shape accepted (404 for missing file)', false, e.message);
  }

  // ---- 5. Login throttling: 429 after the configured limit ----------------
  // The global throttler bucket counts the upload requests above; the per-route
  // login bucket is independent, so this is deterministic.
  try {
    const statuses = [];
    for (let i = 0; i <= LOGIN_LIMIT; i++) {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'tester@example.com', password: 'secret' });
      statuses.push(res.status);
    }
    const under = statuses.slice(0, LOGIN_LIMIT);
    assert(under.every(s => s < 400), `requests under the limit must succeed, got ${under}`);
    assertThrottled(statuses, LOGIN_LIMIT, 'login');
    report('login throttling returns 429 after limit', true);
  } catch (e) {
    report('login throttling returns 429 after limit', false, e.message);
  }

  // ---- 6. Upload throttling: 429 after the configured limit ---------------
  // Uses a fresh app instance so the upload bucket is empty, isolating this case
  // from the login bucket and from step 1. Every request is rejected by the
  // cheap `Content-Type` first pass, so nothing is staged, written, or left
  // behind while the throttler still counts each request.
  try {
    const moduleRef2 = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(AuthService).useValue({ async login() { return 'dummy-token'; } })
      .overrideProvider(PhotosService).useValue({})
      .compile();
    const app2 = moduleRef2.createNestApplication();
    app2.setGlobalPrefix('api');
    await app2.init();
    const server2 = app2.getHttpServer();

    const statuses = [];
    for (let i = 0; i <= UPLOAD_LIMIT; i++) {
      const res = await request(server2)
        .post('/api/photos/upload')
        .field('visitorName', 'tester')
        .attach('image', Buffer.from('not-an-image'), { filename: 'a.txt', contentType: 'text/plain' });
      statuses.push(res.status);
    }
    const under = statuses.slice(0, UPLOAD_LIMIT);
    assert(under.every(s => s === 400), `rejected uploads must return 400, got ${under}`);
    assertThrottled(statuses, UPLOAD_LIMIT, 'upload');
    report('upload throttling returns 429 after limit', true);
    await app2.close();
  } catch (e) {
    report('upload throttling returns 429 after limit', false, e.message);
  }

  // ---- 7. Content-validation unit checks (isolated child process) ---------
  try {
    const script = path.resolve(__dirname, 'upload-validation-isolated.js');
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    assert(out.includes('valid-jpeg=ok'), 'a genuine JPEG must be accepted');
    assert(out.includes('valid-jpeg-canonical-ext=ok'), 'stored extension must come from content');
    assert(out.includes('valid-jpeg-mime=ok'), 'stored MIME must come from content');
    assert(out.includes('valid-jpeg-renamed-on-disk=ok'), 'the verified file must be renamed on disk');
    assert(out.includes('valid-png=ok'), 'a genuine PNG must be accepted');
    assert(out.includes('valid-gif=ok'), 'a genuine GIF must be accepted');
    assert(out.includes('spoofed-html-as-png=rejected'), 'HTML bytes declared image/png must be rejected');
    assert(out.includes('jpeg-bytes-svg-name=rejected'), 'content/extension mismatch must be rejected');
    assert(out.includes('jpeg-bytes-declared-png=rejected'), 'content/declared-type mismatch must be rejected');
    assert(out.includes('truncated-jpeg=rejected'), 'a truncated image must be rejected');
    assert(out.includes('empty-file=rejected'), 'an empty upload must be rejected');
    assert(out.includes('unstaged-filename=rejected'), 'an unstaged filename must fail closed');
    assert(out.includes('prod-ignores-escape-hatch=rejected'),
      'the non-production escape hatch must be inert in production');
    report('upload content validation (isolated process)', true);
  } catch (e) {
    report('upload content validation (isolated process)', false, e.message);
  }

  // ---- 8. JWT fail-fast (isolated child process) --------------------------
  try {
    const script = path.resolve(__dirname, 'jwt-secret-isolated.js');
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    assert(out.includes('prod-missing=throws'), 'prod missing secret must throw');
    assert(out.includes('dev-missing=throws'), 'dev missing secret must throw (no fallback)');
    assert(out.includes('env-unset-missing=throws'), 'missing secret with NODE_ENV unset must throw');
    assert(out.includes('placeholder=throws'), 'the old default secret must be rejected');
    assert(out.includes('too-short=throws'), 'a too-short secret must be rejected');
    assert(out.includes('valid=ok'), 'a strong secret must resolve unchanged');
    report('JWT secret fail-fast and validation (isolated process)', true);
  } catch (e) {
    report('JWT secret fail-fast and validation (isolated process)', false, e.message);
  }

  // ---- 9. Session revocation (isolated child process) ---------------------
  try {
    const script = path.resolve(__dirname, 'jwt-revocation-isolated.js');
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    assert(out.includes('valid-token=allowed'), 'a current token must authenticate');
    assert(out.includes('bumped-version=rejected'), 'a token whose ver is stale must be rejected');
    assert(out.includes('fresh-after-bump=allowed'), 'a token reissued at the new ver must authenticate');
    assert(out.includes('legacy-no-ver=rejected'), 'a token without a ver claim must be rejected');
    assert(out.includes('deleted-admin=rejected'), 'a token for a deleted admin must be rejected');
    assert(out.includes('no-token=rejected'), 'a request with no token must be rejected');
    assert(out.includes('bad-signature=rejected'), 'an unsigned/garbage token must be rejected');
    report('session revocation via tokenVersion (isolated process)', true);
  } catch (e) {
    report('session revocation via tokenVersion (isolated process)', false, e.message);
  }

  await app.close();
  fs.rmSync(TEMP_UPLOAD_DIR, { recursive: true, force: true });

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.error('FAILED CHECKS:');
    failed.forEach(f => console.error(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error running e2e tests:', err);
  process.exit(1);
});
