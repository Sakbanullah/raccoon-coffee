import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_DIR, uploadedFilenamePattern } from '../uploads/upload.config';

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findApproved(page = 1, limit = 12) {
    const where = { status: 'APPROVED' as const };
    const [total, photos] = await this.prisma.$transaction([
      this.prisma.photoUpload.count({ where }),
      this.prisma.photoUpload.findMany({
        where,
        select: {
          photoId: true,
          imageUrl: true,
          caption: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: photos,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findPending() {
    const photos = await this.prisma.photoUpload.findMany({
      where: { status: 'PENDING' },
      select: {
        photoId: true,
        visitorName: true,
        caption: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: photos, meta: { total: photos.length } };
  }

  async findApprovedForAdmin() {
    const photos = await this.prisma.photoUpload.findMany({
      where: { status: 'APPROVED' },
      select: {
        photoId: true,
        visitorName: true,
        caption: true,
        imageUrl: true,
        createdAt: true,
        reviewedAt: true,
      },
      orderBy: { reviewedAt: 'desc' },
    });
    return { data: photos, meta: { total: photos.length } };
  }

  async moderatePhoto(photoId: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    await this.assertPhotoExists(photoId);

    const photo = await this.prisma.photoUpload.update({
      where: { photoId },
      data: {
        status,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
    });
    return { data: { ...photo, fileSize: photo.fileSize?.toString() } };
  }

  async removePhoto(photoId: string) {
    const photo = await this.prisma.photoUpload.findUnique({
      where: { photoId },
      select: { photoId: true, imageUrl: true },
    });
    if (!photo) {
      throw new NotFoundException(`Photo ${photoId} not found.`);
    }

    await this.prisma.photoUpload.delete({ where: { photoId } });

    // Only files served from the upload route are owned by the backend. Legacy records point at
    // frontend static assets (/images/...) and must never be unlinked from UPLOAD_DIR.
    // Best-effort: a missing file (ENOENT) must not block removal of the record that is already gone.
    const prefix = '/api/photos/uploads/';
    if (photo.imageUrl.startsWith(prefix)) {
      const filename = photo.imageUrl.slice(prefix.length);
      if (uploadedFilenamePattern('wall').test(filename)) {
        await unlink(join(UPLOAD_DIR, filename)).catch(() => undefined);
      }
    }
    return { data: { photoId } };
  }

  private async assertPhotoExists(photoId: string) {
    const photo = await this.prisma.photoUpload.findUnique({
      where: { photoId },
      select: { photoId: true },
    });
    if (!photo) {
      throw new NotFoundException(`Photo ${photoId} not found.`);
    }
  }

  async createPendingUpload(file: Express.Multer.File, visitorName: string, caption?: string) {
    const imageUrl = `/api/photos/uploads/${file.filename}`;

    const photo = await this.prisma.photoUpload.create({
      data: {
        visitorName,
        caption: caption || null,
        imageUrl,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        status: 'PENDING',
      },
    });

    return { 
      message: 'Photo uploaded successfully and is pending review.',
      data: {
        ...photo,
        fileSize: photo.fileSize?.toString()
      }
    };
  }
}
