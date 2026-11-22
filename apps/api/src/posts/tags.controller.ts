import { Controller, Get } from '@nestjs/common';
import { TagCount } from '@vp/shared';
import { PrismaService } from '../prisma/prisma.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<TagCount[]> {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            posts: {
              where: {
                post: {
                  deletedAt: null,
                  approved: true,
                  status: 'READY',
                },
              },
            },
          },
        },
      },
    });

    return tags
      .map((tag) => ({ name: tag.name, count: tag._count.posts }))
      .filter((tag) => tag.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 20);
  }
}
