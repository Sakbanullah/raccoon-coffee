const DEV_FALLBACK_SECRET = 'super-secret-raccoon-key';

/**
 * Resolve the JWT signing secret.
 *
 * Production MUST provide JWT_SECRET — a missing secret is a hard failure so the
 * process cannot silently fall back to a well-known value. Development keeps the
 * fallback for convenience.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. Refusing to start with an insecure default secret.',
    );
  }

  return DEV_FALLBACK_SECRET;
}

export const JWT_SECRET = resolveJwtSecret();
