import { IsString, IsOptional, MaxLength, IsNumberString, IsUrl, IsBoolean } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  province?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @IsOptional()
  @IsNumberString()
  latitude?: string;

  @IsString()
  @IsOptional()
  @IsNumberString()
  longitude?: string;

  @IsString()
  @IsOptional()
  openingTime?: string;

  @IsString()
  @IsOptional()
  closingTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  mapsUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}