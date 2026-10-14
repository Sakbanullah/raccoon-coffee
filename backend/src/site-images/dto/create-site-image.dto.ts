import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SECTION_KEYS, SectionKey } from '../section-slots';

/**
 * Multipart body for `POST /api/site-images`.
 *
 * The image file itself arrives as the `image` part handled by the multer
 * interceptor; this DTO validates the accompanying text fields.
 */
export class CreateSiteImageDto {
  @IsString()
  @IsIn(SECTION_KEYS, {
    message: `section must be one of: ${SECTION_KEYS.join(', ')}.`,
  })
  section!: SectionKey;

  @IsString()
  @MaxLength(50)
  slot!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string;
}
