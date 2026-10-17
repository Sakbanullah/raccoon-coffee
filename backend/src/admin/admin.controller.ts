import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  // Public discovery/health endpoint only; it returns no admin data.
  @Get()
  health(): { status: string; module: string } {
    return { status: 'ok', module: 'admin' };
  }
}
