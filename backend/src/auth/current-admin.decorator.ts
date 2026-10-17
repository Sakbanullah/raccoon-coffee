import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export interface AdminIdentity {
  adminId: string;
  email: string;
  name: string;
  /** Current Admin.tokenVersion, loaded by JwtAuthGuard. */
  ver: number;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminIdentity;
    }
  }
}

export const CurrentAdmin = createParamDecorator<AdminIdentity, unknown>(
  (_data: unknown, ctx: ExecutionContext): AdminIdentity => {
    const admin = ctx.switchToHttp().getRequest<Request>().admin;
    if (!admin) {
      throw new UnauthorizedException();
    }
    return admin;
  },
);
