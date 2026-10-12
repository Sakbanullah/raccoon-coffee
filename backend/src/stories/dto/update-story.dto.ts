import { IsString, IsOptional, MaxLength, IsEnum, Matches } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class UpdateStoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^(https?:\/\/[^\s]+|\/[^\s]*)$/, { message: 'coverImageUrl must be an http(s) URL or a path starting with "/".' })
  coverImageUrl?: string;

  @IsEnum(ContentStatus, { message: 'status must be a valid ContentStatus enum value.' })
  @IsOptional()
  status?: ContentStatus;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, { message: 'publishedAt must be an ISO 8601 UTC string.' })
  publishedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  branchId?: string;
}