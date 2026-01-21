import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  menuItemId: string;

  @IsUUID()
  orderId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number; // 1-5

  @IsOptional()
  @IsString()
  comment?: string;
}
