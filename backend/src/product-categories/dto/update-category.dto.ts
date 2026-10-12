import { IsString, IsOptional, MaxLength, IsInt } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}