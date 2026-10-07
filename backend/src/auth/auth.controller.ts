import { Controller, Post, Body, Res, Get, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentAdmin } from './current-admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const token = await this.authService.login(body.email, body.password);
    
    // Set HttpOnly cookie
    res.cookie('raccoon_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return { message: 'Logged in successfully' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('raccoon_auth_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentAdmin() admin: any) {
    return {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name
    };
  }
}
