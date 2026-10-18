import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto, paginationMeta } from '../common/pagination-query.dto';
import { parseTime } from '../common/time.util';

const BRANCH_SELECT = {
  branchId: true,
  name: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  openingTime: true,
  closingTime: true,
  phone: true,
  mapsUrl: true,
  isActive: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(pagination?: PaginationQueryDto) {
    const where = { isActive: true };
    // No page/limit params â†’ legacy full list.
    if (!pagination?.page && !pagination?.limit) {
      const branches = await this.prisma.branch.findMany({
        where,
        select: BRANCH_SELECT,
      });
      return { data: branches, meta: { total: branches.length } };
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 12;
    const [total, branches] = await this.prisma.$transaction([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        select: BRANCH_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: branches, meta: paginationMeta(total, page, limit) };
  }

  async findAll() {
    const branches = await this.prisma.branch.findMany({
      select: BRANCH_SELECT,
      orderBy: { name: 'asc' },
    });
    return { data: branches, meta: { total: branches.length } };
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { branchId: id, isActive: true },
      select: BRANCH_SELECT,
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found.`);
    }
    return { data: branch };
  }

  async findOneForAdmin(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { branchId: id },
      select: BRANCH_SELECT,
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found.`);
    }
    return { data: branch };
  }

  async create(dto: CreateBranchDto) {
    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        openingTime: parseTime(dto.openingTime) ?? null,
        closingTime: parseTime(dto.closingTime) ?? null,
        phone: dto.phone ?? null,
        mapsUrl: dto.mapsUrl ?? null,
        isActive: dto.isActive ?? true,
      },
      select: BRANCH_SELECT,
    });
    return { data: branch };
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOneForAdmin(id);
    const branch = await this.prisma.branch.update({
      where: { branchId: id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.openingTime !== undefined && { openingTime: parseTime(dto.openingTime) ?? null }),
        ...(dto.closingTime !== undefined && { closingTime: parseTime(dto.closingTime) ?? null }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.mapsUrl !== undefined && { mapsUrl: dto.mapsUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: BRANCH_SELECT,
    });
    return { data: branch };
  }

  async remove(id: string) {
    await this.findOneForAdmin(id);
    const branch = await this.prisma.branch.delete({
      where: { branchId: id },
      select: BRANCH_SELECT,
    });
    return { data: branch };
  }
}

