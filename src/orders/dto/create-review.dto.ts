export class CreateReviewDto {
  menuItemId: string;
  orderId: string;
  rating: number; // 1-5
  comment?: string;
}
