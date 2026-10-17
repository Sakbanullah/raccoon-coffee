import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IMAGE_STORAGE, ImageStorage } from './image-storage.service';

/**
 * Upload namespaces this application owns and serves.
 *
 * A URL is only ever eligible for deletion when it matches one of these
 * namespaces *and* the generated filename pattern for that prefix. External
 * URLs and frontend static assets (`/images/...`) can never match, so they are
 * never touched.
 */
const OWNED_NAMESPACES = [
  { prefix: 'wall', servePath: '/api/photos/uploads/' },
  { prefix: 'product', servePath: '/api/products/uploads/' },
  { prefix: 'site', servePath: '/api/site-images/uploads/' },
] as const;

/**
 * Post-write cleanup for image URLs that a database row no longer references.
 *
 * Call this **after** the database write has committed (delete or update). The
 * ordering is deliberate: a record must never point at a file that was already
 * removed, so the worst case here is a leftover file, never a broken image.
 */
@Injectable()
export class ImageCleanupService {
  private readonly logger = new Logger(ImageCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
  ) {}

  /**
   * Delete `imageUrl` when this application owns it and no remaining row in any
   * image-bearing table references it. Best-effort: returns `false` and logs a
   * warning instead of failing the request that already succeeded.
   */
  async removeIfUnreferenced(imageUrl: string | null | undefined): Promise<boolean> {
    if (!imageUrl) return false;

    try {
      const [products, stories, events, siteImages, photos] = await Promise.all([
        this.prisma.product.count({ where: { imageUrl } }),
        this.prisma.story.count({ where: { coverImageUrl: imageUrl } }),
        this.prisma.event.count({ where: { coverImageUrl: imageUrl } }),
        this.prisma.siteImage.count({ where: { imageUrl } }),
        this.prisma.photoUpload.count({ where: { imageUrl } }),
      ]);
      if (products + stories + events + siteImages + photos > 0) return false;

      for (const { prefix, servePath } of OWNED_NAMESPACES) {
        if (await this.storage.removeIfOwned(imageUrl, prefix, false, servePath)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.warn(
        `Could not clean up unreferenced image ${imageUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
