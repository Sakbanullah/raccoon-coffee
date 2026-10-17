import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Map Prisma's known request errors to meaningful HTTP statuses (M-12).
 *
 * Before this filter an unhandled `P2002` (unique constraint) reached the client
 * as a generic `500`, so an admin creating a duplicate slug could not tell a
 * validation problem from a server fault. Only the error *code* is translated:
 * no query, column value, or stack trace is ever sent to the client. Codes that
 * are not listed keep the default `500` shape, so nothing new leaks.
 */
const MAPPED: Record<string, { status: number; error: string; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'A record with the same unique value already exists.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'A referenced record does not exist.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'The requested record does not exist.',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = MAPPED[exception.code];

    if (!mapped) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
      return;
    }

    response.status(mapped.status).json({
      statusCode: mapped.status,
      error: mapped.error,
      message: mapped.message,
    });
  }
}
