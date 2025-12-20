import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TableStatus } from './create-table.dto';

export class QueryTablesDto {
  @IsOptional()
  @IsEnum(TableStatus, {
    message: 'Status must be either active or inactive',
  })
  status?: TableStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(['table_number', 'capacity', 'created_at'], {
    message: 'Sort by must be table_number, capacity, or created_at',
  })
  sortBy?: 'table_number' | 'capacity' | 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be asc or desc',
  })
  sortOrder?: 'asc' | 'desc';
}
