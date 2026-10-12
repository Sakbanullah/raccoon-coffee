import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findApproved() {
    const photos = await this.prisma.photoUpload.findMany({
      where: { status: 'APPROVED' },
      select: {
        photoId: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: photos, meta: { total: photos.length } };
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
