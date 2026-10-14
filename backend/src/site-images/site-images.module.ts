import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { SiteImagesController } from './site-images.controller';
import { SiteImagesService } from './site-images.service';

@Module({
  imports: [UploadsModule],
  controllers: [SiteImagesController],
  providers: [SiteImagesService],
})
export class SiteImagesModule {}
