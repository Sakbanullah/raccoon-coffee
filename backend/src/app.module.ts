import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { ShutdownModule } from './shutdown/shutdown.module';
import { AdminModule } from './admin/admin.module';
import { BranchesModule } from './branches/branches.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { StoriesModule } from './stories/stories.module';
import { EventsModule } from './events/events.module';
import { PhotosModule } from './photos/photos.module';
import { SiteImagesModule } from './site-images/site-images.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    ShutdownModule,
    AdminModule,
    BranchesModule,
    ProductCategoriesModule,
    ProductsModule,
    StoriesModule,
    EventsModule,
    PhotosModule,
    SiteImagesModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}

