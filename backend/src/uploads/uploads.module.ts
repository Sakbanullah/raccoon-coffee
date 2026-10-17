import { Module } from '@nestjs/common';
import { IMAGE_STORAGE, LocalDiskImageStorage } from './image-storage.service';
import { ImageCleanupService } from './image-cleanup.service';

export { IMAGE_STORAGE };

/**
 * Provides the image storage boundary to feature modules.
 *
 * The local disk provider is bound to the `IMAGE_STORAGE` token. Swapping to
 * object storage later means registering a different provider here, not
 * editing the feature services.
 */
@Module({
  providers: [
    LocalDiskImageStorage,
    { provide: IMAGE_STORAGE, useExisting: LocalDiskImageStorage },
    ImageCleanupService,
  ],
  exports: [IMAGE_STORAGE, LocalDiskImageStorage, ImageCleanupService],
})
export class UploadsModule {}
