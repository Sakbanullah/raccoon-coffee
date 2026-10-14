import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UPLOAD_DIR, uploadedFilenamePattern } from '../uploads/upload.config';
import { imageUploadInterceptor } from '../uploads/upload.config';
import { Response } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.service.findAll({ categoryId: query.category, publicOnly: query.public === 'true' });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  // ponytail: seed product IDs are slugs (e.g. "p-…"), not UUIDs, so ParseUUIDPipe rejected every
  // PATCH with 400. Prisma parameterizes the value; add an ID format rule if IDs get a fixed shape.
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(imageUploadInterceptor('product'))
  uploadProductImage(@UploadedFile() file?: Express.Multer.File) {
    return this.service.storeImage(file);
  }

  @Get('uploads/:filename')
  serveUploadedImage(@Param('filename') filename: string, @Res() res: Response) {
    if (!uploadedFilenamePattern('product').test(filename)) {
      throw new BadRequestException('Invalid filename');
    }
    res.sendFile(filename, { root: UPLOAD_DIR }, (err) => {
      if (err) {
        return res.status(404).send();
      }
    });
  }
}