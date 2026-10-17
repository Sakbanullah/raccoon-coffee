import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto, paginationMeta } from '../common/pagination-query.dto';

const CATEGORY_SELECT = {
  categoryId: true,
  name: true,
  slug: true,
  displayOrder: true,
} as const;

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination?: PaginationQueryDto) {
    // No page/limit params → legacy full list (homepage + admin rely on this).
    if (!pagination?.page && !pagination?.limit) {
      const categories = await this.prisma.productCategory.findMany({
        select: CATEGORY_SELECT,
        orderBy: { displayOrder: 'asc' },
      });
      return { data: categories, meta: { total: categories.length } };
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 12;
    const [total, categories] = await this.prisma.$transaction([
      this.prisma.productCategory.count(),
      this.prisma.productCategory.findMany({
        select: CATEGORY_SELECT,
        orderBy: { displayOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: categories, meta: paginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { categoryId: id },
      select: CATEGORY_SELECT,
    });
    if (!category) {
      throw new NotFoundException(`Product category ${id} not found.`);
    }
    return { data: category };
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        displayOrder: dto.displayOrder ?? 0,
      },
      select: CATEGORY_SELECT,
    });
    return { data: category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const category = await this.prisma.productCategory.update({
      where: { categoryId: id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
      select: CATEGORY_SELECT,
    });
    return { data: category };
  }

  async remove(id: string) {
    await this.findOne(id);
    const category = await this.prisma.productCategory.delete({
      where: { categoryId: id },
      select: CATEGORY_SELECT,
    });
    return { data: category };
  }
}
