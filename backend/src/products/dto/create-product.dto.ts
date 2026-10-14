import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumberString, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { IsImageUrl } from '../../uploads/image-url.decorator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsNotEmpty()
  price!: string; // Decimal stored as string

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
  @IsNotEmpty()
  @MaxLength(36)
  categoryId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  branchId?: string;
}