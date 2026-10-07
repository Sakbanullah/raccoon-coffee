import { Controller, Get } from '@nestjs/common';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Get()
  findPublished() {
    return this.service.findPublished();
  }
}
