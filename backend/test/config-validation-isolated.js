/**
 * Isolated startup configuration validation check (M-11).
 *
 * Spawned as a child process so mutating process.env cannot contaminate other
 * tests. Loads only the compiled config module — no Nest app, no Prisma
 * connection, no listening socket.
 *
 * Prints `case=<ok|fail>` lines for security.e2e.js to consume.
 * No configured value is ever printed: assertions check the `ok` flag and
 * whether messages mention the tested variable NAME, not its value.
 */

'use strict';

const CONFIG_PATH = require.resolve('../dist/config/config.validation');

function loadFresh() {
  delete require.cache[CONFIG_PATH];
  return require(CONFIG_PATH);
}

const results = [];
function report(name, ok) {
  results.push(`${name}=${ok ? 'ok' : 'fail'}`);
}

// Base "valid production" environment reused by the cases below. The secret and
// connection string are dummy test values, still never printed.
function validEnv() {
  return {
    NODE_ENV: 'production',
    PORT: '3001',
    TRUST_PROXY: '1',
    JWT_SECRET: 'unit-test-secret-at-least-32-characters-long',
    DATABASE_URL: 'mysql://user:pw@127.0.0.1:3306/raccoon_test',
    UPLOAD_DIR: '',
  };
}

function withEnv(env) {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (!(key in env)) delete process.env[key];
  }
  Object.assign(process.env, env);
  return () => {
    for (const key of Object.keys(process.env)) {
      if (!(key in saved)) delete process.env[key];
    }
    Object.assign(process.env, saved);
  };
}

function check() {
  const { validateConfig } = loadFresh();

  // 1. A complete, valid configuration passes with no errors.
  {
    const restore = withEnv(validEnv());
    const r = validateConfig();
    report('valid-config', r.ok === true && r.errors.length === 0);
    restore();
  }

  // 2. Missing JWT_SECRET fails (H-5 rules, delegated).
  {
    const env = validEnv();
    delete env.JWT_SECRET;
    const restore = withEnv(env);
    const r = validateConfig();
    report('missing-jwt-secret', r.ok === false && r.errors.some((e) => e.includes('JWT_SECRET')));
    restore();
  }

  // 3. Weak/too-short JWT_SECRET fails.
  {
    const env = validEnv();
    env.JWT_SECRET = 'short-secret';
    const restore = withEnv(env);
    const r = validateConfig();
    report('weak-jwt-secret', r.ok === false && r.errors.some((e) => e.includes('JWT_SECRET')));
    restore();
  }

  // 4. Missing DATABASE_URL fails, without echoing any connection string.
  {
    const env = validEnv();
    delete env.DATABASE_URL;
    const restore = withEnv(env);
    const r = validateConfig();
    report('missing-database-url', r.ok === false && r.errors.some((e) => e.includes('DATABASE_URL')));
    restore();
  }

  // 5. Placeholder DATABASE_URL fails.
  {
    const env = validEnv();
    env.DATABASE_URL = 'mysql://<user>:<password>@<host>:3306/<db>';
    const restore = withEnv(env);
    const r = validateConfig();
    report('placeholder-database-url', r.ok === false && r.errors.some((e) => e.includes('DATABASE_URL')));
    restore();
  }

  // 6. Non-mysql scheme fails.
  {
    const env = validEnv();
    env.DATABASE_URL = 'postgres://user:pw@127.0.0.1:5432/raccoon';
    const restore = withEnv(env);
    const r = validateConfig();
    report('bad-scheme-database-url', r.ok === false && r.errors.some((e) => e.includes('mysql')));
    restore();
  }

  // 7. Invalid PORT fails.
  {
    const env = validEnv();
    env.PORT = 'not-a-port';
    const restore = withEnv(env);
    const r = validateConfig();
    report('invalid-port', r.ok === false && r.errors.some((e) => e.includes('PORT')));
    restore();
  }

  // 8. Invalid TRUST_PROXY fails.
  {
    const env = validEnv();
    env.TRUST_PROXY = 'yes';
    const restore = withEnv(env);
    const r = validateConfig();
    report('invalid-trust-proxy', r.ok === false && r.errors.some((e) => e.includes('TRUST_PROXY')));
    restore();
  }

  // 9. Production without TRUST_PROXY: starts, but warns.
  {
    const env = validEnv();
    delete env.TRUST_PROXY;
    const restore = withEnv(env);
    const r = validateConfig();
    report('prod-no-trust-proxy-warns', r.ok === true && r.warnings.some((w) => w.includes('TRUST_PROXY')));
    restore();
  }

  // 10. Unset NODE_ENV: starts, but warns about Secure cookies.
  {
    const env = validEnv();
    delete env.NODE_ENV;
    const restore = withEnv(env);
    const r = validateConfig();
    report('unset-node-env-warns', r.ok === true && r.warnings.some((w) => w.includes('NODE_ENV')));
    restore();
  }

  // 11. Unknown NODE_ENV value fails.
  {
    const env = validEnv();
    env.NODE_ENV = 'prod';
    const restore = withEnv(env);
    const r = validateConfig();
    report('unknown-node-env', r.ok === false && r.errors.some((e) => e.includes('NODE_ENV')));
    restore();
  }

  // 12. No error or warning ever echoes a secret-like value. Every tested
  // secret/credential substring is a dummy test value, checked only here.
  {
    const env = validEnv();
    env.DATABASE_URL = 'mysql://user:pw@127.0.0.1:3306/raccoon_test';
    const restore = withEnv(env);
    const r = validateConfig({ ...env, JWT_SECRET: undefined });
    const all = [...r.errors, ...r.warnings].join('\n');
    report('no-secret-echo', !all.includes('pw@') && !all.includes(':3306/raccoon_test'));
    restore();
  }

  // 13. Failure messages never contain the JWT secret value itself.
  {
    const env = validEnv();
    env.JWT_SECRET = 'unit-test-secret-at-least-32-characters-long';
    env.DATABASE_URL = 'mysql://user:pw@127.0.0.1:3306/raccoon_test'; // placeholder, to force errors
    env.NODE_ENV = 'bad-value';
    const restore = withEnv(env);
    const r = validateConfig(env);
    const all = [...r.errors, ...r.warnings].join('\n');
    report('no-secret-value-in-errors', !all.includes('unit-test-secret-at-least-32-characters-long'));
    restore();
  }

  console.log(results.join('\n'));
}

check();
