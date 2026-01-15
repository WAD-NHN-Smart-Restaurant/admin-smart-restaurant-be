import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetRestaurantBillsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: ['payment_pending', 'completed', 'cancelled'],
    example: 'completed',
  })
  @IsEnum(['payment_pending', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'payment_pending' | 'completed' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: ['cash', 'zalopay', 'momo', 'vnpay', 'stripe'],
    example: 'cash',
  })
  @IsEnum(['cash', 'zalopay', 'momo', 'vnpay', 'stripe'])
  @IsOptional()
  paymentMethod?: 'cash' | 'zalopay' | 'momo' | 'vnpay' | 'stripe';

  @ApiPropertyOptional({
    description: 'Search by table number',
    example: '5',
  })
  @IsString()
  @IsOptional()
  tableNumber?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'created_at',
    enum: ['created_at', 'total_amount', 'table_number'],
  })
  @IsEnum(['created_at', 'total_amount', 'table_number'])
  @IsOptional()
  sortBy?: 'created_at' | 'total_amount' | 'table_number';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
