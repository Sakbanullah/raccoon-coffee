import { Controller, Post, Body, Req, Res, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminIdentity, CurrentAdmin } from './current-admin.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // Rate limit: max 5 login attempts per minute per IP (throttle credential stuffing).
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, csrfToken } = await this.authService.login(body.email, body.password);
    
    // Set HttpOnly JWT cookie (used by guards)
    res.cookie('raccoon_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Set non-HttpOnly CSRF cookie (used for double-submit validation)
    res.cookie('raccoon_csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { message: 'Logged in successfully', csrfToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Server-side revocation (H-2) BEFORE clearing the cookie: increment the
    // admin's tokenVersion so the presented token (and every other session of
    // the same admin) stops authenticating. Scoped to the token's admin; a
    // missing/invalid token is a no-op, keeping logout idempotent. The token
    // itself is never logged.
    await this.authService.revokeByToken(req.cookies?.['raccoon_auth_token']);

    res.clearCookie('raccoon_auth_token', { path: '/' });
    res.clearCookie('raccoon_csrf', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentAdmin() admin: AdminIdentity) {
    return {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name
    };
  }
}
