/**
 * Isolated JWT fail-fast / validation check.
 *
 * Spawned as a child process so mutating NODE_ENV / JWT_SECRET cannot
 * contaminate the in-process Nest tests. Reads only the compiled constants
 * module, so no Nest app, Prisma connection, or other module runs.
 *
 * Prints the following lines, consumed by test/security.e2e.js:
 *   prod-missing=throws|FAIL
 *   dev-missing=throws|FAIL
 *   env-unset-missing=throws|FAIL
 *   placeholder=throws|FAIL
 *   too-short=throws|FAIL
 *   valid=ok|FAIL
 *
 * Note: `dist/auth/constants.js` resolves its optional local .env from
 * `dist/auth/../.env` (i.e. `dist/.env`), which does not exist, so process.env
 * is the single source of truth for these assertions.
 */

'use strict';

const CONSTANTS_PATH = require.resolve('../dist/auth/constants');

function loadFresh() {
  delete require.cache[CONSTANTS_PATH];
  return require(CONSTANTS_PATH);
}

function capture(fn) {
  try {
    fn();
    return { threw: false };
  } catch (e) {
    return { threw: true, message: String(e && e.message) };
  }
}

function check() {
  const out = [];
  const saved = { ...process.env };

  try {
    // 1. Production, no secret -> hard failure.
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    out.push(`prod-missing=${capture(() => loadFresh().resolveJwtSecret()).threw ? 'throws' : 'FAIL'}`);

    // 2. Development, no secret -> hard failure (no dev fallback any more).
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    out.push(`dev-missing=${capture(() => loadFresh().resolveJwtSecret()).threw ? 'throws' : 'FAIL'}`);

    // 3. NODE_ENV unset, no secret -> hard failure (NODE_ENV cannot gate this).
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    out.push(`env-unset-missing=${capture(() => loadFresh().resolveJwtSecret()).threw ? 'throws' : 'FAIL'}`);

    // 4. The previously shipped default value must be rejected explicitly.
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'super-secret-raccoon-key';
    out.push(`placeholder=${capture(() => loadFresh().resolveJwtSecret()).threw ? 'throws' : 'FAIL'}`);

    // 5. A too-short secret must be rejected.
    process.env.JWT_SECRET = 'short-secret';
    out.push(`too-short=${capture(() => loadFresh().resolveJwtSecret()).threw ? 'throws' : 'FAIL'}`);

    // 6. A sufficiently long, non-placeholder secret resolves unchanged.
    const strong = 'unit-test-secret-at-least-32-characters-long';
    process.env.JWT_SECRET = strong;
    const resolved = loadFresh().resolveJwtSecret();
    out.push(`valid=${resolved === strong ? 'ok' : 'FAIL'}`);
  } finally {
    process.env = saved;
  }

  return out;
}

console.log(check().join('\n'));
