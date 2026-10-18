import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PaginationQueryDto, paginationMeta } from '../common/pagination-query.dto';
import { ImageCleanupService } from '../uploads/image-cleanup.service';

const EVENT_PUBLIC_SELECT = {
  eventId: true,
  title: true,
  slug: true,
  description: true,
  coverImageUrl: true,
  eventDate: true,
  startTime: true,
  endTime: true,
  status: true,
  branchId: true,
} as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cleanup: ImageCleanupService,
  ) {}

  async findPublished(pagination?: PaginationQueryDto) {
    const where = { status: 'PUBLISHED' as const };
    // No page/limit params → legacy full list.
    if (!pagination?.page && !pagination?.limit) {
      const events = await this.prisma.event.findMany({
        where,
        select: EVENT_PUBLIC_SELECT,
        orderBy: { eventDate: 'desc' },
      });
      return { data: events, meta: { total: events.length } };
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 12;
    const [total, events] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: EVENT_PUBLIC_SELECT,
        orderBy: { eventDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: events, meta: paginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { eventId: id, status: 'PUBLISHED' },
      select: EVENT_PUBLIC_SELECT,
    });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found.`);
    }
    return { data: event };
  }

  async findOneForAdmin(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { eventId: id },
      select: EVENT_PUBLIC_SELECT,
    });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found.`);
    }
    return { data: event };
  }

  async create(dto: CreateEventDto) {
    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl ?? null,
        eventDate: new Date(dto.eventDate),
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        status: dto.status ?? 'DRAFT',
        branchId: dto.branchId ?? null,
      },
      select: EVENT_PUBLIC_SELECT,
    });
    return { data: event };
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.findOneForAdmin(id);

    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const event = await this.prisma.event.update({
      where: { eventId: id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.eventDate !== undefined && { eventDate: new Date(dto.eventDate) }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
      select: EVENT_PUBLIC_SELECT,
    });

    // Replacement: only after the row points at the new URL may the old file go.
    if (existing.data.coverImageUrl && existing.data.coverImageUrl !== event.coverImageUrl) {
      await this.cleanup.removeIfUnreferenced(existing.data.coverImageUrl);
    }
    return { data: event };
  }

  async remove(id: string) {
    const existing = await this.findOneForAdmin(id);
    const event = await this.prisma.event.delete({
      where: { eventId: id },
      select: EVENT_PUBLIC_SELECT,
    });
    await this.cleanup.removeIfUnreferenced(existing.data.coverImageUrl);
    return { data: event };
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
