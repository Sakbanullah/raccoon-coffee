import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IMAGE_STORAGE } from '../uploads/uploads.module';
import { ImageStorage } from '../uploads/image-storage.service';
import {
  SECTION_SLOTS,
  SectionKey,
  isSingleSlotSection,
  isValidSection,
  isValidSlot,
} from './section-slots';

/** Prefix namespacing files owned by this feature, mirroring `wall` / `product`. */
const STORAGE_PREFIX = 'site';

/** Fields returned to both public and admin callers. */
const SITE_IMAGE_SELECT = {
  siteImageId: true,
  sectionKey: true,
  slotKey: true,
  imageUrl: true,
  altText: true,
  displayOrder: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SiteImagesService {
  private readonly logger = new Logger(SiteImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
  ) {}

  /** Public read: visible images only, for a validated section. */
  async findPublic(section: string) {
    const sectionKey = this.assertSection(section);

    const images = await this.prisma.siteImage.findMany({
      where: { sectionKey, isVisible: true },
      select: SITE_IMAGE_SELECT,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return { data: images, meta: { total: images.length } };
  }

  /** Admin read: visible and hidden images for a validated section. */
  async findForAdmin(section: string) {
    const sectionKey = this.assertSection(section);

    const images = await this.prisma.siteImage.findMany({
      where: { sectionKey },
      select: SITE_IMAGE_SELECT,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return { data: images, meta: { total: images.length } };
  }

  /**
   * Store an uploaded image and persist its record.
   *
   * Single-slot sections (`hero`, `brand_story`) replace the existing record for
   * that slot instead of appending, so repeated uploads do not create
   * duplicates. `atmosphere` appends, because it is a gallery.
   */
  async create(section: string, slot: string, altText: string | undefined, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    const sectionKey = this.assertSection(section);
    if (!isValidSlot(sectionKey, slot)) {
      throw new BadRequestException(
        `slot must be one of: ${SECTION_SLOTS[sectionKey].join(', ')} for section ${sectionKey}.`,
      );
    }

    const { url } = this.storage.store(file, STORAGE_PREFIX);

    if (isSingleSlotSection(sectionKey)) {
      return this.upsertSingleSlot(sectionKey, slot, url, altText);
    }

    try {
      const displayOrder = await this.nextDisplayOrder(sectionKey);
      const created = await this.prisma.siteImage.create({
        data: {
          sectionKey,
          slotKey: slot,
          imageUrl: url,
          altText: altText ?? null,
          displayOrder,
          isVisible: true,
        },
        select: SITE_IMAGE_SELECT,
      });

      return { data: created };
    } catch (error) {
      // The DB write failed, so nothing references the just-stored file.
      // Best-effort cleanup; the original error is what callers must see.
      await this.storage.removeIfOwned(url, STORAGE_PREFIX, false);
      throw error;
    }
  }

  /**
   * Replace the image for a single-slot section.
   *
   * The previous file is removed only after the database write succeeds, so a
   * failed write never leaves the record pointing at a deleted file.
   */
  private async upsertSingleSlot(
    sectionKey: SectionKey,
    slot: string,
    imageUrl: string,
    altText: string | undefined,
  ) {
    const existing = await this.prisma.siteImage.findFirst({
      where: { sectionKey, slotKey: slot },
      select: { siteImageId: true, imageUrl: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!existing) {
      try {
        const created = await this.prisma.siteImage.create({
          data: {
            sectionKey,
            slotKey: slot,
            imageUrl,
            altText: altText ?? null,
            displayOrder: 0,
            isVisible: true,
          },
          select: SITE_IMAGE_SELECT,
        });
        return { data: created };
      } catch (error) {
        await this.storage.removeIfOwned(imageUrl, STORAGE_PREFIX, false);
        throw error;
      }
    }

    const updated = await this.prisma.siteImage.update({
      where: { siteImageId: existing.siteImageId },
      data: {
        imageUrl,
        // Omitting altText preserves the stored value on a pure image swap.
        ...(altText !== undefined && { altText }),
      },
      select: SITE_IMAGE_SELECT,
    }).catch(async (error) => {
      // The write failed, so the old record still points at its previous file
      // and the new upload is unreferenced. Clean it up, then surface the error.
      if (existing.imageUrl !== imageUrl) {
        await this.storage.removeIfOwned(imageUrl, STORAGE_PREFIX, false);
      }
      throw error;
    });

    // The record now points at the new file. Old-file cleanup runs outside the
    // write's try/catch and is best-effort: a failure here must never delete the
    // file the database now references, nor roll back a successful replacement.
    if (existing.imageUrl !== imageUrl) {
      try {
        await this.removeFileIfUnreferenced(existing.imageUrl, existing.siteImageId);
      } catch (error) {
        // Leaves at most an orphaned old file; the replacement is already committed.
        this.logger.warn(
          `Could not clean up replaced site image ${existing.imageUrl}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { data: updated };
  }

  async update(id: string, dto: { altText?: string; isVisible?: boolean; displayOrder?: number }) {
    await this.assertExists(id);

    const updated = await this.prisma.siteImage.update({
      where: { siteImageId: id },
      data: {
        ...(dto.altText !== undefined && { altText: dto.altText }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
      select: SITE_IMAGE_SELECT,
    });

    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.siteImage.findUnique({
      where: { siteImageId: id },
      select: { siteImageId: true, imageUrl: true },
    });
    if (!existing) {
      throw new NotFoundException(`Site image ${id} not found.`);
    }

    await this.prisma.siteImage.delete({ where: { siteImageId: id } });

    // Best-effort cleanup after the row is gone. Never affects static frontend
    // assets or files still referenced by another record.
    await this.removeFileIfUnreferenced(existing.imageUrl, existing.siteImageId);

    return { data: { siteImageId: id } };
  }

  /**
   * Delete a stored file only when the storage provider owns it and no other
   * database record still references the same URL.
   *
   * Reference checks cover this table plus every existing model that stores an
   * image URL, so a shared image is never deleted out from under Product,
   * Story, Event, or PhotoUpload.
   */
  private async removeFileIfUnreferenced(imageUrl: string, excludeId: string) {
    const [otherSiteImages, productCount, storyCount, eventCount, photoCount] =
      await Promise.all([
        this.prisma.siteImage.count({
          where: { imageUrl, NOT: { siteImageId: excludeId } },
        }),
        this.prisma.product.count({ where: { imageUrl } }),
        this.prisma.story.count({ where: { coverImageUrl: imageUrl } }),
        this.prisma.event.count({ where: { coverImageUrl: imageUrl } }),
        this.prisma.photoUpload.count({ where: { imageUrl } }),
      ]);

    const referencedElsewhere =
      otherSiteImages > 0 || productCount > 0 || storyCount > 0 || eventCount > 0 || photoCount > 0;

    await this.storage.removeIfOwned(imageUrl, STORAGE_PREFIX, referencedElsewhere);
  }

  /** Append gallery images after the current highest order. */
  private async nextDisplayOrder(sectionKey: string): Promise<number> {
    const last = await this.prisma.siteImage.findFirst({
      where: { sectionKey },
      select: { displayOrder: true },
      orderBy: { displayOrder: 'desc' },
    });
    return (last?.displayOrder ?? -1) + 1;
  }

  private assertSection(section: string): SectionKey {
    if (!isValidSection(section)) {
      throw new BadRequestException(
        `section must be one of: ${Object.keys(SECTION_SLOTS).join(', ')}.`,
      );
    }
    return section;
  }

  private async assertExists(id: string) {
    const existing = await this.prisma.siteImage.findUnique({
      where: { siteImageId: id },
      select: { siteImageId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Site image ${id} not found.`);
    }
  }
}
