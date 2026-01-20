export class OrderHistoryDto {
  id: string;
  tableNumber?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  completedAt?: string;
  guestName?: string;
  orderItemsCount: number;
}
