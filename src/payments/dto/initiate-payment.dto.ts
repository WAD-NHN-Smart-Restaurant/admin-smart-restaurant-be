import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  @IsIn(['cash', 'stripe'])
  method: 'cash' | 'stripe';

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsNumber()
  tipAmount?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;
}
