import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Body for `PATCH /api/site-images/:id`.
 *
 * Image replacement is deliberately NOT supported here: replacing an image
 * requires a new file upload and storage-cleanup logic, so it stays on
 * `POST /api/site-images`. This endpoint only edits metadata.
 */
export class UpdateSiteImageDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
