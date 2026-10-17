import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UPLOAD_DIR, imageContentValidationInterceptor, imageUploadInterceptor, uploadedFilenamePattern } from '../uploads/upload.config';
import { SiteImagesService } from './site-images.service';
import { FindSiteImagesQueryDto } from './dto/find-site-images-query.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CreateSiteImageDto } from './dto/create-site-image.dto';
import { UpdateSiteImageDto } from './dto/update-site-image.dto';

/** Must match the prefix passed to the storage provider by the service. */
const STORAGE_PREFIX = 'site';

@Controller('site-images')
export class SiteImagesController {
  constructor(private readonly service: SiteImagesService) {}

  /** Public: visible images for one landing-page section. */
  @Get()
  findPublic(@Query() query: FindSiteImagesQueryDto & PaginationQueryDto) {
    return this.service.findPublic(query.section, query);
  }

  /** Admin: visible and hidden images for one section. */
  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findForAdmin(@Query() query: FindSiteImagesQueryDto) {
    return this.service.findForAdmin(query.section);
  }

  /** Admin: upload and register (or replace) a section image. */
  @UseGuards(JwtAuthGuard)
  @Post()
  // Order matters: multer stages the file first, then the content check decides
  // whether the bytes may be kept.
  @UseInterceptors(imageUploadInterceptor(STORAGE_PREFIX), imageContentValidationInterceptor(STORAGE_PREFIX))
  create(@Body() dto: CreateSiteImageDto, @UploadedFile() file?: Express.Multer.File) {
    return this.service.create(dto.section, dto.slot, dto.altText, file);
  }

  /** Admin: update metadata only. Image replacement goes through POST. */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteImageDto) {
    return this.service.update(id, dto);
  }

  /** Admin: delete the record and, when safe, its owned file. */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  /** Serve stored files. Same allowlist pattern as the product/wall routes. */
  @Get('uploads/:filename')
  serveUploadedImage(@Param('filename') filename: string, @Res() res: Response) {
    if (!uploadedFilenamePattern(STORAGE_PREFIX).test(filename)) {
      throw new BadRequestException('Invalid filename');
    }
    // Filenames are unique per upload (prefix-timestamp-random), so a given URL
    // is immutable. Safe to cache aggressively: a replaced image gets a new URL.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filename, { root: UPLOAD_DIR }, (err) => {
      if (err) {
        return res.status(404).send();
      }
    });
  }
}
