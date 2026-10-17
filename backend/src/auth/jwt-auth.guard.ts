import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { resolveJwtSecret } from './constants';
import type { AdminIdentity } from './current-admin.decorator';

/** Claims embedded in every admin session token. */
export interface AdminTokenPayload {
  adminId: string;
  email: string;
  name: string;
  /** Admin.tokenVersion at the time the token was issued (H-2). */
  ver: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.['raccoon_auth_token'];

    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: AdminTokenPayload;
    try {
      // Resolved and validated at verification time too, so the module and the
      // guard can never disagree about which secret is in force. Throws a
      // non-secret error if the secret is missing/weak/default.
      payload = await this.jwtService.verifyAsync<AdminTokenPayload>(token, {
        secret: resolveJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException();
    }

    // Server-side revocation (H-2): a valid signature/expiry is not enough — the
    // admin must still exist and its token version must match the one baked into
    // the token. One primary-key lookup per authenticated request; deliberately
    // uncached so revocation (logout / password rotation) takes effect on the
    // very next request. `ver` is required and must be an integer: tokens issued
    // before this deploy carry no `ver` and are rejected rather than trusted.
    let admin: { adminId: string; email: string; name: string; tokenVersion: number } | null;
    try {
      admin = await this.prisma.admin.findUnique({
        where: { adminId: payload.adminId },
        select: { adminId: true, email: true, name: true, tokenVersion: true },
      });
    } catch {
      // Do not expose database details through an authentication endpoint.
      throw new UnauthorizedException();
    }

    if (!admin || !Number.isInteger(payload.ver) || payload.ver !== admin.tokenVersion) {
      throw new UnauthorizedException();
    }

    // Expose fresh, server-authoritative identity rather than the token claims.
    request.admin = {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name,
      ver: admin.tokenVersion,
    } satisfies AdminIdentity;

    // CSRF protection for state-changing requests (non-GET, excluding auth routes)
    // `request.path` excludes the query string; the global `/api` prefix (if any)
    // is stripped by Nest's router, so match the module-relative path.
    const method = request.method?.toUpperCase() || 'GET';
    const path = request.path ?? '';

    // Skip CSRF validation for:
    // 1. GET/HEAD/OPTIONS requests (read-only / preflight)
    // 2. /auth/login and /auth/logout (token issuance/revocation, no cookie yet)
    if (
      method === 'GET' ||
      method === 'HEAD' ||
      method === 'OPTIONS' ||
      path.startsWith('/auth/') ||
      path.startsWith('/api/auth/')
    ) {
      return true;
    }

    // Require X-CSRF-Token header for state-changing requests
    const csrfToken = request.headers['x-csrf-token'];
    const csrfCookie = request.cookies?.['raccoon_csrf'];

    // Normalize header value (Express can make it string or string[])
    const normalizedToken = Array.isArray(csrfToken) ? csrfToken[0] : csrfToken;

    if (!normalizedToken || !csrfCookie || normalizedToken !== csrfCookie) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
