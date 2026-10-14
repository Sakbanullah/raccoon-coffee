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

  // ---- 1. Valid upload -> served back (isolated temp dir) -----------------
  try {
    const res = await request(server)
      .post('/api/photos/upload')
      .field('visitorName', 'e2e-visitor')
      .attach('image', Buffer.from('fake-jpeg-bytes'), {
        filename: 'wall-999-888.jpg',
        contentType: 'image/jpeg',
      });
    assert(res.status === 201 || res.status === 200, `valid upload must succeed, got ${res.status}`);
    const imageUrl = res.body && res.body.data && res.body.data.imageUrl;
    assert(typeof imageUrl === 'string' && imageUrl.startsWith('/api/photos/uploads/wall-'),
      `response must contain a served imageUrl, got ${JSON.stringify(res.body)}`);

    const filename = imageUrl.split('/').pop();
    const served = await request(server).get(`/api/photos/uploads/${filename}`);
    assert(served.status === 200, `uploaded file must be servable, got ${served.status}`);
    report('valid upload accepted and served back (200)', true);
  } catch (e) {
    report('valid upload accepted and served back (200)', false, e.message);
  }

  // ---- 2. Filename validation on the static route -------------------------
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

  // ---- 3. Login throttling: 429 after the configured limit ----------------
  // Wait out the throttler window from step 1/2 (upload bucket is per-route, but
  // the global default bucket also counts these; flush it deterministically).
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

  // ---- 4. Upload throttling: 429 after the configured limit ---------------
  // Uses a fresh app instance so the upload bucket is empty, isolating this case
  // from the login bucket and from step 1. Files fail the mimetype filter, so
  // nothing is written to disk while the throttler still counts each request.
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

  // ---- 5. JWT fail-fast (isolated child process) --------------------------
  try {
    const script = path.resolve(__dirname, 'jwt-secret-isolated.js');
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    assert(out.includes('dev-fallback=ok'), 'dev fallback check failed');
    assert(out.includes('prod-missing=throws'), 'prod missing secret must throw');
    assert(out.includes('prod-with-secret=ok'), 'prod secret must resolve');
    report('JWT secret fail-fast (isolated process)', true);
  } catch (e) {
    report('JWT secret fail-fast (isolated process)', false, e.message);
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
