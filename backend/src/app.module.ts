import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { BranchesModule } from './branches/branches.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductsModule } from './products/products.module';
import { StoriesModule } from './stories/stories.module';
import { EventsModule } from './events/events.module';
import { PhotosModule } from './photos/photos.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    BranchesModule,
    ProductCategoriesModule,
    ProductsModule,
    StoriesModule,
    EventsModule,
    PhotosModule,
    AuthModule,
  ],
})
export class AppModule {}
