import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { PaginationQueryDto, paginationMeta } from '../common/pagination-query.dto';

const STORY_PUBLIC_SELECT = {
  storyId: true,
  title: true,
  slug: true,
  content: true,
  coverImageUrl: true,
  status: true,
  publishedAt: true,
  branchId: true,
} as const;

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished(pagination?: PaginationQueryDto) {
    const where = { status: 'PUBLISHED' as const };
    // No page/limit params → legacy full list.
    if (!pagination?.page && !pagination?.limit) {
      const stories = await this.prisma.story.findMany({
        where,
        select: STORY_PUBLIC_SELECT,
        orderBy: { publishedAt: 'desc' },
      });
      return { data: stories, meta: { total: stories.length } };
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 12;
    const [total, stories] = await this.prisma.$transaction([
      this.prisma.story.count({ where }),
      this.prisma.story.findMany({
        where,
        select: STORY_PUBLIC_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: stories, meta: paginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { storyId: id },
      select: STORY_PUBLIC_SELECT,
    });
    if (!story) {
      throw new NotFoundException(`Story ${id} not found.`);
    }
    return { data: story };
  }

  async create(dto: CreateStoryDto) {
    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const story = await this.prisma.story.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl ?? null,
        status: dto.status ?? 'DRAFT',
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        branchId: dto.branchId ?? null,
      },
      select: STORY_PUBLIC_SELECT,
    });
    return { data: story };
  }

  async update(id: string, dto: UpdateStoryDto) {
    await this.findOne(id);

    if (dto.branchId) {
      await this.assertBranchExists(dto.branchId);
    }

    const story = await this.prisma.story.update({
      where: { storyId: id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.publishedAt !== undefined && { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
      select: STORY_PUBLIC_SELECT,
    });
    return { data: story };
  }

  async remove(id: string) {
    await this.findOne(id);
    const story = await this.prisma.story.delete({
      where: { storyId: id },
      select: STORY_PUBLIC_SELECT,
    });
    return { data: story };
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