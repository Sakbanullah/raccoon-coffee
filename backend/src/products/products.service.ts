import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: { categoryId?: string }) {
    const where = filter?.categoryId ? { categoryId: filter.categoryId } : undefined;
    const products = await this.prisma.product.findMany({
      where,
      select: {
        productId: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        imageUrl: true,
        status: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
    return { data: products, meta: { total: products.length } };
  }
}
