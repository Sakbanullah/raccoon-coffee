import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SECTION_KEYS, SectionKey } from '../section-slots';

/** Query DTO for `GET /api/site-images` and `GET /api/site-images/admin`. */
export class FindSiteImagesQueryDto {
  @IsString()
  @IsIn(SECTION_KEYS, {
    message: `section must be one of: ${SECTION_KEYS.join(', ')}.`,
  })
  section!: SectionKey;
}
