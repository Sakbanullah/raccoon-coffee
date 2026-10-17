/**
 * Isolated session-revocation (H-2) check.
 *
 * Spawned as a child process by test/security.e2e.js so it can import the
 * compiled guard/JwtService directly and inject a fake PrismaService — no Nest
 * app and no database connection. Asserts the guard's revocation behaviour:
 * valid signature/expiry alone must NOT authenticate a token whose `ver` claim
 * no longer matches the admin's stored tokenVersion.
 *
 * Prints `name=allowed|rejected`, consumed by the e2e runner.
 */

'use strict';

const SECRET = 'unit-test-secret-at-least-32-characters-long';
// The guard resolves the real signing secret from the environment at verify
// time; set it before requiring the compiled modules so both sign and verify
// use the same value. Never a real secret.
process.env.JWT_SECRET = SECRET;

const { JwtService } = require('@nestjs/jwt');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');

const jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: '1d' } });

// Fake PrismaService: only `admin.findUnique` is exercised by the guard.
const admins = new Map();
const prisma = {
  admin: {
    async findUnique({ where, select }) {
      const row = admins.get(where.adminId);
      if (!row) return null;
      // Guard selects specific fields; mirror that shape (never the password).
      return {
        adminId: row.adminId,
        email: row.email,
        name: row.name,
        tokenVersion: row.tokenVersion,
      };
    },
  },
};

const guard = new JwtAuthGuard(jwt, prisma);

function contextFor(token) {
  const request = { cookies: token ? { raccoon_auth_token: token } : {}, method: 'GET', path: '/auth/me', headers: {} };
  return { switchToHttp: () => ({ getRequest: () => request }), request };
}

async function attempt(token) {
  try {
    await guard.canActivate(contextFor(token));
    return 'allowed';
  } catch {
    return 'rejected';
  }
}

async function run() {
  const out = [];
  const admin = { adminId: 'admin-1', email: 'a@b.c', name: 'Admin', tokenVersion: 3 };
  admins.set(admin.adminId, admin);

  const valid = await jwt.signAsync({ adminId: admin.adminId, email: admin.email, name: admin.name, ver: 3 });

  out.push(`valid-token=${(await attempt(valid)) === 'allowed' ? 'allowed' : 'FAIL'}`);

  // Revoked: tokenVersion bumped after the token was issued (logout / password change).
  admin.tokenVersion = 4;
  out.push(`bumped-version=${(await attempt(valid)) === 'rejected' ? 'rejected' : 'FAIL'}`);

  // A freshly issued token at the new version works again.
  const fresh = await jwt.signAsync({ adminId: admin.adminId, email: admin.email, name: admin.name, ver: 4 });
  out.push(`fresh-after-bump=${(await attempt(fresh)) === 'allowed' ? 'allowed' : 'FAIL'}`);

  // Legacy token with no `ver` claim must never be trusted.
  const legacy = await jwt.signAsync({ adminId: admin.adminId, email: admin.email, name: admin.name });
  out.push(`legacy-no-ver=${(await attempt(legacy)) === 'rejected' ? 'rejected' : 'FAIL'}`);

  // Deleted admin: valid signature, no row -> rejected.
  admin.tokenVersion = 99; // make stored value irrelevant; row is then removed
  const orphan = await jwt.signAsync({ adminId: admin.adminId, email: admin.email, name: admin.name, ver: 99 });
  admins.delete(admin.adminId);
  out.push(`deleted-admin=${(await attempt(orphan)) === 'rejected' ? 'rejected' : 'FAIL'}`);

  // No cookie at all.
  out.push(`no-token=${(await attempt(undefined)) === 'rejected' ? 'rejected' : 'FAIL'}`);

  // Garbage token.
  out.push(`bad-signature=${(await attempt('not.a.jwt')) === 'rejected' ? 'rejected' : 'FAIL'}`);

  return out;
}

run()
  .then((lines) => console.log(lines.join('\n')))
  .catch((err) => {
    console.error(`FAIL: ${err.message}`);
    process.exitCode = 1;
  });
