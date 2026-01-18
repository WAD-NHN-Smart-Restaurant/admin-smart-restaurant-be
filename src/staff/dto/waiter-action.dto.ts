import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptOrderItemDto {
  @ApiPropertyOptional({
    description: 'Optional note when accepting order item',
    example: 'Confirmed availability',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectOrderItemDto {
  @ApiProperty({
    description: 'Reason for rejecting the order item',
    example: 'Item out of stock',
  })
  @IsString()
  reason: string;
}

export class SendToKitchenDto {
  @ApiProperty({
    description: 'Array of order item IDs to send to kitchen',
    example: [
      'a1111111-1111-1111-1111-111111111111',
      'a2222222-2222-2222-2222-222222222222',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  order_item_ids: string[];
}

export class MarkAsServedDto {
  @ApiProperty({
    description: 'Array of order item IDs to mark as served',
    example: [
      'a1111111-1111-1111-1111-111111111111',
      'a2222222-2222-2222-2222-222222222222',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  order_item_ids: string[];

  @ApiPropertyOptional({
    description: 'Optional note when marking items as served',
    example: 'Delivered to table 5',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
