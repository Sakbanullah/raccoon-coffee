import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string): Promise<{ token: string; csrfToken: string }> {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });
    
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // `ver` mirrors Admin.tokenVersion (H-2) so the guard can reject this token
    // as soon as the admin's sessions are revoked.
    const payload = {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name,
      ver: admin.tokenVersion,
    };
    const token = await this.jwtService.signAsync(payload);
    // Simple cryptographically secure CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    return { token, csrfToken };
  }

  /**
   * Revoke every session token previously issued to this admin (H-2).
   *
   * Incrementing `tokenVersion` makes every JWT carrying the old `ver` claim
   * fail the guard's database check on its next request. This is global, not
   * per-device: logging out of one browser invalidates all sessions of the same
   * admin, including other browsers/devices.
   *
   * Returns silently for an unknown/deleted admin so logout stays idempotent.
   */
  async revokeSessions(adminId: string): Promise<void> {
    // `updateMany` (not `update`) so an admin deleted mid-request is a no-op
    // instead of a P2025 throw.
    await this.prisma.admin.updateMany({
      where: { adminId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  /**
   * Best-effort revocation for the token in `raccoon_auth_token`. Used by
   * logout, which must not fail on a missing/expired/forged token — in those
   * cases there is nothing worth revoking. The token is never logged.
   */
  async revokeByToken(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwtService.verifyAsync<{ adminId?: string }>(token);
      if (typeof payload.adminId === 'string') {
        await this.revokeSessions(payload.adminId);
      }
    } catch {
      // Invalid/expired token: nothing to revoke.
    }
  }
}
