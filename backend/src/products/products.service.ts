import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_SELECT = {
  productId: true,
  categoryId: true,
  branchId: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  imageUrl: true,
  status: true,
  isVisible: true,
  isBestSeller: true,
  displayOrder: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: { categoryId?: string; publicOnly?: boolean }) {
    const where = {
      ...(filter?.categoryId && { categoryId: filter.categoryId }),
      // ponytail: public menu filter only; admin list still returns hidden/inactive rows.
      ...(filter?.publicOnly && { status: 'ACTIVE' as const, isVisible: true }),
    };
    const products = await this.prisma.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
    return { data: products, meta: { total: products.length } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      select: PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    return { data: product };
  }

  async create(dto: CreateProductDto) {
    await this.assertCategoryExists(dto.categoryId);
    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        price: dto.price,
        imageUrl: dto.imageUrl ?? null,
        status: dto.status,
        isVisible: dto.isVisible ?? true,
        isBestSeller: dto.isBestSeller ?? false,
        displayOrder: dto.displayOrder ?? 0,
        categoryId: dto.categoryId,
        branchId: dto.branchId ?? null,
      },
      select: PRODUCT_SELECT,
    });
    return { data: product };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }
    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const product = await this.prisma.product.update({
      where: { productId: id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.isBestSeller !== undefined && { isBestSeller: dto.isBestSeller }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
      select: PRODUCT_SELECT,
    });
    return { data: product };
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.product.delete({ where: { productId: id } });
    return { data: existing.data };
  }

  async storeImage(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }
    return { data: { imageUrl: `/api/products/uploads/${file.filename}` } };
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { categoryId },
      select: { categoryId: true },
    });
    if (!category) {
      throw new BadRequestException('Product category not found.');
    }
  }

  private async assertBranchExists(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId },
      select: { branchId: true },
    });
    if (!branch) {
      throw new BadRequestException('Branch not found.');
    }
  }
}