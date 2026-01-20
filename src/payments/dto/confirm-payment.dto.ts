import { IsIn, IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @IsIn(['success', 'failed'])
  status: 'success' | 'failed' = 'success';
}
