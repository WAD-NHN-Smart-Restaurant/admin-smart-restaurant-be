import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Database } from '../../supabase/supabase.types';

export class CreateBillDto {
  @ApiProperty({
    description: 'Order ID to create bill for',
    example: 'a1111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  order_id: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'zalopay', 'momo', 'vnpay', 'stripe'],
    example: 'cash',
  })
  @IsEnum(['cash', 'zalopay', 'momo', 'vnpay', 'stripe'])
  payment_method: Database['public']['Enums']['payment_method'];
}

export class ApplyDiscountDto {
  @ApiProperty({
    description: 'Type of discount',
    enum: ['percentage', 'fixed'],
    example: 'percentage',
  })
  @IsEnum(['percentage', 'fixed'])
  discount_type: 'percentage' | 'fixed';

  @ApiProperty({
    description: 'Discount value (percentage or fixed amount)',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  discount_value: number;

  @ApiPropertyOptional({
    description: 'Reason for discount',
    example: 'Senior citizen discount',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'zalopay', 'momo', 'vnpay', 'stripe'],
    example: 'cash',
  })
  @IsEnum(['cash', 'zalopay', 'momo', 'vnpay', 'stripe'])
  payment_method: Database['public']['Enums']['payment_method'];
}

export class BillResponseDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty()
  tableNumber: string;

  @ApiProperty({ type: [Object] })
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: Array<{
      name: string;
      price: number;
    }>;
  }>;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  discount: number;

  @ApiProperty()
  tax: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  discountReason?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}
