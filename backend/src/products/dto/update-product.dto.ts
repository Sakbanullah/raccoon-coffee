import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumberString, IsEnum, IsUrl, IsInt } from 'class-validator';
import { ProductStatus } from '@prisma/client';

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

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

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
