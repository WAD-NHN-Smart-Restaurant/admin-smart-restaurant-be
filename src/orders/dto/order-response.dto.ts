export class OrderResponseDto {
  id: string;
  tableId: string;
  restaurantId: string;
  status: string;
  guestName?: string;
  notes?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  orderItems?: OrderItemResponseDto[];
}

export class OrderItemResponseDto {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  specialRequest?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderItemOptions?: OrderItemOptionResponseDto[];
}

export class OrderItemOptionResponseDto {
  id: string;
  orderItemId: string;
  modifierOptionId: string;
  modifierOptionName: string;
  priceAtTime: number;
  createdAt: string;
}
