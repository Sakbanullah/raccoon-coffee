import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';

// ponytail: blocks tag/quote openers only; emoji, accents, currency pass through.
const NO_MARKUP = /^[^<>"']*$/;
const NO_MARKUP_MESSAGE = { message: 'Input tidak boleh mengandung karakter <, >, ", atau \'' };

export class UploadPhotoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(NO_MARKUP, NO_MARKUP_MESSAGE)
  visitorName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(NO_MARKUP, NO_MARKUP_MESSAGE)
  caption?: string;
}