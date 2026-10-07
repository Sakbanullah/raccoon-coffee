import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.productCategory.findMany({
      select: {
        categoryId: true,
        name: true,
        slug: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
    return { data: categories, meta: { total: categories.length } };
  }
}
