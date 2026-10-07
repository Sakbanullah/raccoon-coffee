import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindProductsQueryDto {
  /** ProductCategory.categoryId (uuid CHAR(36)) */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  category?: string;
}
