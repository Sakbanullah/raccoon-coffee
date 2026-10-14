/**
 * Isolated JWT fail-fast check.
 *
 * Spawned as a child process so mutating NODE_ENV / JWT_SECRET cannot
 * contaminate the in-process Nest tests. Reads only the compiled constants
 * module, so no Nest app, Prisma connection, or other module runs.
 *
 * Prints three lines consumed by test/security.e2e.js:
 *   dev-fallback=ok|FAIL
 *   prod-missing=throws|FAIL
 *   prod-with-secret=ok|FAIL
 */

'use strict';

const CONSTANTS_PATH = require.resolve('../dist/auth/constants');

function loadFresh() {
  delete require.cache[CONSTANTS_PATH];
  return require(CONSTANTS_PATH);
}

function check() {
  const out = [];
  const saved = { ...process.env };

  try {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    const dev = loadFresh().resolveJwtSecret();
    out.push(`dev-fallback=${dev === 'super-secret-raccoon-key' ? 'ok' : 'FAIL'}`);

    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    let threw = false;
    try {
      loadFresh().resolveJwtSecret();
    } catch {
      threw = true;
    }
    out.push(`prod-missing=${threw ? 'throws' : 'FAIL'}`);

    process.env.JWT_SECRET = 'isolated-test-secret';
    const prod = loadFresh().resolveJwtSecret();
    out.push(`prod-with-secret=${prod === 'isolated-test-secret' ? 'ok' : 'FAIL'}`);
  } finally {
    process.env = saved;
  }

  return out;
}

console.log(check().join('\n'));
