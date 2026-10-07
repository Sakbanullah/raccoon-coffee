import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    const events = await this.prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        eventId: true,
        title: true,
        slug: true,
        description: true,
        coverImageUrl: true,
        eventDate: true,
        startTime: true,
        status: true,
      },
      orderBy: { eventDate: 'desc' },
    });
    return { data: events, meta: { total: events.length } };
  }
}
