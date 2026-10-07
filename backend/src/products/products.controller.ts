import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.service.findAll({ categoryId: query.category });
  }
}
