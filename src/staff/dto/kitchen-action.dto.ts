import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    description: 'Order item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  order_item_id: string;

  @ApiProperty({
    description: 'New status for the order item',
    enum: ['preparing', 'ready'],
    example: 'preparing',
  })
  @IsEnum(['preparing', 'ready'])
  status: 'preparing' | 'ready';

  @ApiPropertyOptional({
    description: 'Optional note about the status update',
    example: 'Extra spicy as requested',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkUpdateOrderItemsDto {
  @ApiProperty({
    description: 'Array of order item IDs to update',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsUUID('4', { each: true })
  order_item_ids: string[];

  @ApiProperty({
    description: 'New status for all order items',
    enum: ['preparing', 'ready'],
    example: 'ready',
  })
  @IsEnum(['preparing', 'ready'])
  status: 'preparing' | 'ready';
}

export class GetKitchenOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: ['accepted', 'preparing', 'ready', 'completed'],
    example: 'preparing',
  })
  @IsOptional()
  @IsEnum(['accepted', 'preparing', 'ready', 'completed'])
  status?: 'accepted' | 'preparing' | 'ready' | 'completed';

  @ApiPropertyOptional({
    description: 'Search by table number or order number',
    example: 'Table 5',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders from this date (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter orders until this date (ISO format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
