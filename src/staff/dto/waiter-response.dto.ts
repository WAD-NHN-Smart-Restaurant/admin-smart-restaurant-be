import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModifierOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  priceAdjustment: number;
}

export class OrderItemOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderItemId: string;

  @ApiProperty()
  modifierOptionId: string;

  @ApiProperty()
  priceAtTime: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: ModifierOptionResponseDto })
  modifierOption: ModifierOptionResponseDto;
}

export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  prepTimeMinutes?: number;
}

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  menuItemId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({
    enum: ['pending', 'accepted', 'rejected', 'preparing', 'ready', 'served'],
  })
  status: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: MenuItemResponseDto })
  menuItem: MenuItemResponseDto;

  @ApiProperty({ type: [OrderItemOptionResponseDto] })
  orderItemOptions: OrderItemOptionResponseDto[];
}

export class TableResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tableNumber: string;

  @ApiProperty()
  capacity: number;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  restaurantId: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  orderNumber?: string;

  @ApiProperty()
  tableId: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiProperty({
    enum: ['active', 'payment_pending', 'completed', 'cancelled'],
  })
  status: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: TableResponseDto })
  table: TableResponseDto;

  @ApiProperty({ type: [OrderItemResponseDto] })
  orderItems: OrderItemResponseDto[];
}

export class PaginationResponseDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class OrdersListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination: PaginationResponseDto;
}
