import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { ContentStatus } from '@prisma/client';
import { ValidateSlug } from '../../stories/dto/slug.validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ValidateSlug()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^(https?:\/\/[^\s]+|\/[^\s]*)$/, { message: 'coverImageUrl must be an http(s) URL or a path starting with "/".' })
  coverImageUrl?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'eventDate must be a valid date in YYYY-MM-DD format.' })
  eventDate!: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format (00:00-23:59).' })
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format (00:00-23:59).' })
  endTime?: string;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(36)
  branchId?: string;
}
