import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

export class FindProductsQueryDto extends PaginationQueryDto {
  /** ProductCategory.categoryId (uuid CHAR(36)) */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  category?: string;

  /** 'true' limits results to ACTIVE + visible products (public website). */
  @IsOptional()
  @IsIn(['true', 'false'])
  public?: string;
}
