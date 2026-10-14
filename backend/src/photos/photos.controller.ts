import { Controller, Get, Post, Patch, Delete, UploadedFile, Body, Res, Param, BadRequestException, UseGuards, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PhotosService } from './photos.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { UPLOAD_DIR, imageUploadInterceptor, uploadedFilenamePattern } from '../uploads/upload.config';

@Controller('photos')
export class PhotosController {
  constructor(private readonly service: PhotosService) {}

  @Get()
  findApproved() {
    return this.service.findApproved();
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  findPending() {
    return this.service.findPending();
  }

  @UseGuards(JwtAuthGuard)
  @Get('approved')
  findApprovedForAdmin() {
    return this.service.findApprovedForAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removePhoto(@Param('id') id: string) {
    // Legacy seeded photos use non-UUID ids (e.g. "photo-1"), so UUID-only validation would reject them.
    // Accept the Char(36) id shape; unknown ids still return 404 from the service.
    if (!/^[A-Za-z0-9-]{1,36}$/.test(id)) {
      throw new BadRequestException('Invalid photo id.');
    }
    return this.service.removePhoto(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve')
  approvePhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentAdmin() admin: any) {
    return this.service.moderatePhoto(id, 'APPROVED', admin.adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  rejectPhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentAdmin() admin: any) {
    return this.service.moderatePhoto(id, 'REJECTED', admin.adminId);
  }

  @Post('upload')
  // Rate limit: max 5 uploads per minute per IP (per-route bucket).
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseInterceptors(imageUploadInterceptor('wall'))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    return this.service.createPendingUpload(file, dto.visitorName, dto.caption);
  }

  @Get('uploads/:filename')
  // Prevent path traversal – only allow filenames that match the generated pattern.
  servePhoto(@Param('filename') filename: string, @Res() res: Response) {
    if (!uploadedFilenamePattern('wall').test(filename)) {
      throw new BadRequestException('Invalid filename');
    }
    res.sendFile(filename, { root: UPLOAD_DIR }, (err) => {
      if (err) {
        // If the file does not exist or cannot be read, respond 404.
        return res.status(404).send();
      }
    });
  }
}