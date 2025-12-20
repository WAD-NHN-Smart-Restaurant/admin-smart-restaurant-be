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
import { ApiProperty } from '@nestjs/swagger';

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  INACTIVE = 'inactive',
}

export enum TableLocation {
  INDOOR = 'Indoor',
  OUTDOOR = 'Outdoor',
  PATIO = 'Patio',
  VIP_ROOM = 'VIP Room',
}

export class CreateTableDto {
  @ApiProperty({
    description: 'Unique table number/name',
    example: 'T-001',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Table number is required' })
  @MinLength(1, { message: 'Table number must be at least 1 character' })
  @MaxLength(50, { message: 'Table number must not exceed 50 characters' })
  table_number: string;

  @ApiProperty({
    description: 'Number of seats at the table',
    example: 4,
    minimum: 1,
    maximum: 20,
  })
  @IsInt({ message: 'Capacity must be an integer' })
  @Min(1, { message: 'Capacity must be at least 1' })
  @Max(20, { message: 'Capacity must not exceed 20' })
  capacity: number;

  @ApiProperty({
    description: 'Location/zone of the table',
    example: 'Indoor',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Location must not exceed 100 characters' })
  location?: string;

  @ApiProperty({
    description: 'Additional description or notes',
    example: 'Window seat with city view',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Table status',
    enum: TableStatus,
    example: TableStatus.AVAILABLE,
    required: false,
    default: TableStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TableStatus, {
    message: 'Status must be available, occupied, or inactive',
  })
  status?: TableStatus;
}
