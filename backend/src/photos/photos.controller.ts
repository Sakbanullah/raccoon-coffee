import { Controller, Get, Post, Patch, UseInterceptors, UploadedFile, Body, Res, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PhotosService } from './photos.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';

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
  @Patch(':id/approve')
  approvePhoto(@Param('id') id: string, @CurrentAdmin() admin: any) {
    return this.service.moderatePhoto(id, 'APPROVED', admin.adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  rejectPhoto(@Param('id') id: string, @CurrentAdmin() admin: any) {
    return this.service.moderatePhoto(id, 'REJECTED', admin.adminId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `wall-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body('visitorName') visitorName: string,
    @Body('caption') caption?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }
    if (!visitorName) {
      throw new BadRequestException('Visitor name is required.');
    }

    return this.service.createPendingUpload(file, visitorName, caption);
  }

  @Get('uploads/:filename')
  servePhoto(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './uploads' });
  }
}
