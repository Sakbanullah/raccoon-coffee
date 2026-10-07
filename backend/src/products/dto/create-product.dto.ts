import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumberString, IsEnum, IsUrl, IsInt } from 'class-validator';
import { ProductStatus } from '@prisma/client';

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
  @IsNotEmpty()
  @MaxLength(36)
  categoryId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  branchId?: string;
}
