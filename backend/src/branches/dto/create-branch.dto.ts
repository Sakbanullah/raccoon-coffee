import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumberString, IsUrl, IsBoolean, Matches } from 'class-validator';
import { TIME_OF_DAY_PATTERN } from '../../common/time.util';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  province!: string;

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
  @Matches(TIME_OF_DAY_PATTERN, { message: 'openingTime must be a 24-hour "HH:mm" time.' })
  openingTime?: string;

  @IsString()
  @IsOptional()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'closingTime must be a 24-hour "HH:mm" time.' })
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
