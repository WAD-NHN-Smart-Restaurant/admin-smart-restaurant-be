import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TableStatus } from './create-table.dto';

export class QueryTablesDto {
  @ApiProperty({
    description: 'Filter by table status',
    enum: TableStatus,
    required: false,
    example: TableStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TableStatus, {
    message: 'Status must be available, occupied, or inactive',
  })
  status?: TableStatus;

  @ApiProperty({
    description: 'Filter by location/zone',
    required: false,
    example: 'Indoor',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Field to sort by',
    enum: ['tableNumber', 'capacity', 'createdAt'],
    required: false,
    example: 'tableNumber',
  })
  @IsOptional()
  @IsEnum(['tableNumber', 'capacity', 'createdAt'], {
    message: 'Sort by must be tableNumber, capacity, or createdAt',
  })
  sortBy?: 'tableNumber' | 'capacity' | 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
    example: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be asc or desc',
  })
  sortOrder?: 'asc' | 'desc';
}
