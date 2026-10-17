import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Shared M-8 pagination query (same rules as the M-1 photos DTO):
 * both params optional — omitting them keeps the legacy full-list response,
 * providing either one switches to bounded `count()` + `skip`/`take` with
 * `{ page, limit, total, totalPages }` metadata. Page size is capped at 50.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** Meta shape for a paginated list response. */
export function paginationMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}
