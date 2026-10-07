import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        branchId: true,
        name: true,
        address: true,
        city: true,
        openingTime: true,
        closingTime: true,
        mapsUrl: true,
        isActive: true,
      },
    });
    return { data: branches, meta: { total: branches.length } };
  }
}
