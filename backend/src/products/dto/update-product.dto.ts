import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumberString, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { IsImageUrl } from '../../uploads/image-url.decorator';

/** All fields optional; mirrors CreateProductDto for PATCH. */
export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsOptional()
  price?: string;

  @IsImageUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  branchId?: string;
}