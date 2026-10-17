/**
 * Centralized startup configuration validation (M-11 / P-5).
 *
 * `validateConfig()` runs once at bootstrap BEFORE Nest loads any module, so an
 * invalid configuration makes startup fail with one clear, aggregated message
 * that never contains secret values or connection strings.
 *
 * Rules:
 *  - JWT_SECRET: fully delegated to the H-5 validator (auth/constants.ts); this
 *    module adds no fallback and no weaker duplicate check.
 *  - DATABASE_URL: required; must be a non-placeholder mysql:// URL. The value
 *    itself is never echoed — only whether it was present and well-formed.
 *  - UPLOAD_DIR: optional, default ./uploads. Rejected if empty or pointing to
 *    an existing FILE (the operator probably typoed a file path).
 *  - PORT / TRUST_PROXY: optional; must be valid integers when set.
 *  - NODE_ENV: optional; if set it must be development/production/test.
 *
 * Production-only risk warnings (do not start, but do not silently deploy a
 * risky config either):
 *  - TRUST_PROXY unset        → client IPs cannot be trusted for rate limiting
 *    (correct only when NOT behind a proxy).
 *  - TRUST_PROXY > 1 hop      → uncommon; verify against the actual proxy chain.
 *  - NODE_ENV missing         → Secure cookies never get enabled.
 *  - DATABASE_URL localhost / 127.0.0.1 on a VPS → app and DB on the same box
 *    is a valid small-VPS topology; nothing to warn about, so it is NOT warned.
 */
import { mkdirSync, statSync } from 'fs';
import { resolve } from 'path';
import { resolveJwtSecretResult } from '../auth/constants';

const VALID_NODE_ENVS = ['development', 'production', 'test'];

export interface ConfigValidationResult {
  /** False when startup must be aborted. */
  ok: boolean;
  /** Operator-facing hard errors (no secret values, no connection strings). */
  errors: string[];
  /** Operator-facing production risk warnings. */
  warnings: string[];
}

function isLocalDbHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
}

/**
 * Validate the process environment. Reads env only; never logs or returns any
 * configured value.
 */
export function validateConfig(env: NodeJS.ProcessEnv = process.env): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // JWT secret: H-5 rules only. Never weaken, never fall back.
  const jwt = resolveJwtSecretResult();
  if (!jwt.ok && jwt.error) errors.push(jwt.error);

  // NODE_ENV
  if (env.NODE_ENV !== undefined && env.NODE_ENV.trim() !== '') {
    if (!VALID_NODE_ENVS.includes(env.NODE_ENV.trim())) {
      errors.push(
        `NODE_ENV has an unrecognized value (allowed: ${VALID_NODE_ENVS.join(', ')}). ` +
          'Leave it unset for local development or set it to "production" on the server.',
      );
    }
  } else {
    warnings.push(
      'NODE_ENV is not set: Secure-cookie flagging stays off and non-production behavior is assumed. ' +
        'Set NODE_ENV=production on the server (see deployment/raccoon-api.env.example).',
    );
  }

  // DATABASE_URL — format checked without ever printing the value.
  const dbUrl = env.DATABASE_URL?.trim();
  if (!dbUrl) {
    errors.push(
      'DATABASE_URL is not set. Set it to the MySQL/MariaDB connection string, ' +
        'e.g. mysql://<user>:<password>@<host>:3306/<database> (values are never echoed by the validator).',
    );
  } else {
    let parsed: URL | undefined;
    try {
      parsed = new URL(dbUrl);
    } catch {
      errors.push('DATABASE_URL is not a valid URL. Expected format: mysql://<user>:<password>@<host>:3306/<database>.');
    }
    if (parsed) {
      if (parsed.protocol !== 'mysql:' && parsed.protocol !== 'mariadb:') {
        errors.push(
          `DATABASE_URL must use the mysql:// (or mariadb://) scheme; the project runs on MySQL/MariaDB only ` +
            `(got scheme "${parsed.protocol.replace(':', '')}").`,
        );
      }
      if (!parsed.hostname) {
        errors.push('DATABASE_URL is missing the database host.');
      }
      if (!parsed.pathname || parsed.pathname === '/') {
        errors.push('DATABASE_URL is missing the database name.');
      }
      // H-5-style placeholder guard: a template copied from an example must not
      // reach a live deployment.
      if (isLocalDbHost(parsed) && /<[^>]+>/.test(dbUrl)) {
        errors.push('DATABASE_URL still contains placeholder text like <user> or <password>; replace it with real credentials.');
      }
    }
  }

  // PORT
  if (env.PORT !== undefined && env.PORT.trim() !== '') {
    const port = Number(env.PORT.trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push('PORT must be an integer between 1 and 65535.');
    }
  }

  // TRUST_PROXY
  const trustProxy = env.TRUST_PROXY?.trim();
  if (trustProxy !== undefined && trustProxy !== '') {
    const hops = Number(trustProxy);
    if (!Number.isInteger(hops) || hops < 0) {
      errors.push('TRUST_PROXY must be a non-negative integer (the number of reverse-proxy hops).');
    } else if (hops > 1) {
      warnings.push(`TRUST_PROXY is set to ${hops} hops; more than one hop is uncommon. Confirm this matches the actual proxy chain.`);
    }
  } else if (env.NODE_ENV === 'production') {
    // Warning, not an error: valid when the API is exposed directly (no proxy).
    warnings.push(
      'TRUST_PROXY is not set in production: X-Forwarded-For headers are ignored, so client IPs resolve to the ' +
        'proxy address and per-IP rate limiting covers all visitors at once. Set TRUST_PROXY=1 behind Nginx ' +
        '(or the platform load balancer). Only leave it unset when the API is exposed directly.',
    );
  }

  // UPLOAD_DIR — resolved here; main.ts uses this same resolution.
  const uploadDir = resolve(env.UPLOAD_DIR && env.UPLOAD_DIR.trim() !== '' ? env.UPLOAD_DIR.trim() : './uploads');
  try {
    if (statSync(uploadDir).isFile()) {
      errors.push('UPLOAD_DIR points to an existing file instead of a directory. Fix the path.');
    }
  } catch {
    // Does not exist yet — created at startup below (see ensureUploadDir()).
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Create the upload directory after validation passes. Kept separate from
 * validateConfig() so validation stays read-only and trivially testable.
 */
export function ensureUploadDir(env: NodeJS.ProcessEnv = process.env): string {
  const uploadDir = resolve(env.UPLOAD_DIR && env.UPLOAD_DIR.trim() !== '' ? env.UPLOAD_DIR.trim() : './uploads');
  mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

/** Shared default so main.ts and the deploy docs never drift apart. */
export const DEFAULT_PORT = 3001;
