import * as path from 'path';

/**
 * Minimum acceptable length of the JWT signing secret (in characters).
 * 32 chars ≈ 192 bits of entropy for a base64url-encoded 32-byte random secret
 * (e.g. `openssl rand -base64 32`), and is the conventional floor for HS256.
 */
export const JWT_SECRET_MIN_LENGTH = 32;

/**
 * Values that must never be accepted as a signing secret: previously shipped
 * defaults, obvious placeholders, and documented example values. This guards
 * against an operator pasting a known/default value into JWT_SECRET.
 */
const FORBIDDEN_JWT_SECRETS: readonly string[] = [
  'super-secret-raccoon-key',
  'change-me',
  'changeme',
  'change_me',
  'secret',
  'jwt-secret',
  'jwtsecret',
  'your-secret-key',
  'your_jwt_secret',
  'password',
];

// Load backend/.env for local runs ONLY, and only outside production.
//
// Production uses the environment supplied by systemd (EnvironmentFile), so no
// .env file is read there. The require below is deliberately lazy: dotenv is a
// devDependency and is removed on the server by `npm prune --omit=dev`, so the
// production build must never resolve it at startup.
//
// dotenv never overrides variables that are already set, so the real process
// environment (systemd EnvironmentFile, Docker env, shell) always wins.
if (process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv') as typeof import('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw err;
    // dotenv is a devDependency and is absent after `npm prune --omit=dev`.
    // Continue so config validation reports the real problem (e.g. missing
    // JWT_SECRET) instead of an opaque module-resolution crash.
    console.warn(
      'dotenv is not installed: backend/.env was not loaded. ' +
        'Set JWT_SECRET and DATABASE_URL in the process environment.',
    );
  }
}

export interface JwtSecretResolution {
  /** Whether a usable secret was resolved. */
  ok: boolean;
  /** The secret. Present only when `ok` is true. NEVER log or return this value. */
  secret?: string;
  /** Operator-facing, non-secret reason, present only when `ok` is false. */
  error?: string;
}

/**
 * Resolve and validate the JWT signing secret from the environment.
 *
 * There is intentionally NO fallback secret in any environment: a
 * missing/weak/default secret is always a hard failure so the process can never
 * start — and so no token can ever be signed or verified with a well-known
 * value — regardless of whether NODE_ENV is set, misspelled, or non-production.
 *
 * Returns a result object (never the secret in `error`) so the failure can be
 * surfaced as a clear, non-secret message.
 */
export function resolveJwtSecretResult(): JwtSecretResolution {
  const raw = process.env.JWT_SECRET;
  const secret = raw?.trim();

  if (!secret) {
    return {
      ok: false,
      error:
        'JWT_SECRET is not set. Refusing to start: a JWT signing secret is required in every environment ' +
        '(there is no development fallback). Generate one with `openssl rand -base64 32` and set JWT_SECRET ' +
        'in backend/.env (local) or the host environment (production) — see backend/.env.example.',
    };
  }

  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    // Length is safe metadata; the secret value itself is never included.
    return {
      ok: false,
      error:
        `JWT_SECRET is too weak (length ${secret.length}; minimum ${JWT_SECRET_MIN_LENGTH} characters). ` +
        'Generate a strong secret with `openssl rand -base64 32` and set JWT_SECRET — see backend/.env.example.',
    };
  }

  if (FORBIDDEN_JWT_SECRETS.includes(secret.toLowerCase())) {
    return {
      ok: false,
      error:
        'JWT_SECRET is set to a known/default placeholder value and is therefore not usable as a signing secret. ' +
        'Generate a strong secret with `openssl rand -base64 32` and set JWT_SECRET — see backend/.env.example.',
    };
  }

  return { ok: true, secret };
}

/**
 * Resolve the JWT signing secret, throwing a clear, non-secret error if it is
 * missing, too short, or a known/default value. Callers that want to render a
 * friendly message should use {@link resolveJwtSecretResult} instead.
 */
export function resolveJwtSecret(): string {
  const result = resolveJwtSecretResult();
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.secret as string;
}
