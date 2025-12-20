import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum TableStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum TableLocation {
  INDOOR = 'Indoor',
  OUTDOOR = 'Outdoor',
  PATIO = 'Patio',
  VIP_ROOM = 'VIP Room',
}

export class CreateTableDto {
  @IsString()
  @IsNotEmpty({ message: 'Table number is required' })
  @MinLength(1, { message: 'Table number must be at least 1 character' })
  @MaxLength(50, { message: 'Table number must not exceed 50 characters' })
  table_number: string;

  @IsInt({ message: 'Capacity must be an integer' })
  @Min(1, { message: 'Capacity must be at least 1' })
  @Max(20, { message: 'Capacity must not exceed 20' })
  capacity: number;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Location must not exceed 100 characters' })
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TableStatus, {
    message: 'Status must be either active or inactive',
  })
  status?: TableStatus;
}
