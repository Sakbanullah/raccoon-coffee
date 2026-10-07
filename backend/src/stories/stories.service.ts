import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    const stories = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        storyId: true,
        title: true,
        slug: true,
        content: true,
        coverImageUrl: true,
        status: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
    return { data: stories, meta: { total: stories.length } };
  }
}
