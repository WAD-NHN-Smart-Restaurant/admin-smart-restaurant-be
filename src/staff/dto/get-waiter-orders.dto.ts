import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetWaiterOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Search by table number or order ID',
    example: '5',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: ['pending', 'accepted', 'ready', 'served', 'payment_pending'],
    example: 'pending',
  })
  @IsEnum(['pending', 'accepted', 'ready', 'served', 'payment_pending'])
  @IsOptional()
  status?: 'pending' | 'accepted' | 'ready' | 'served' | 'payment_pending';
  @ApiPropertyOptional({
    description: 'Filter by table ID',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  @IsOptional()
  tableId?: string;

  @ApiPropertyOptional({
    description: 'Filter by waiter ID to show only orders from assigned tables',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  @IsOptional()
  waiterId?: string;

  @ApiPropertyOptional({
    description: 'Filter orders from this date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders to this date (ISO 8601)',
    example: '2026-01-31T23:59:59Z',
  })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
