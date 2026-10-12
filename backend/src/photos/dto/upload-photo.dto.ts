import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UploadPhotoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;
}