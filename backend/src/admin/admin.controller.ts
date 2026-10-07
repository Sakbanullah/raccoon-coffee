import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get()
  health(): { status: string; module: string } {
    return { status: 'ok', module: 'admin' };
  }
}
