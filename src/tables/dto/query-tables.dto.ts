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
    enum: ['table_number', 'capacity', 'created_at'],
    required: false,
    example: 'table_number',
  })
  @IsOptional()
  @IsEnum(['table_number', 'capacity', 'created_at'], {
    message: 'Sort by must be table_number, capacity, or created_at',
  })
  sortBy?: 'table_number' | 'capacity' | 'created_at';

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
