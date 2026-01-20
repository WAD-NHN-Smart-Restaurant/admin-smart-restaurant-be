import { IsUUID, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAssignWaiterDto {
  @ApiProperty({
    description: 'Waiter user ID or null to unassign',
    type: String,
    nullable: true,
    example: '8421eb25-ce93-4d47-8736-c4790ffea9dd',
  })
  @IsOptional()
  @IsUUID('4', { message: 'waiter_id must be a valid UUID' })
  waiter_id?: string | null;

  @ApiProperty({
    description: 'Array of table IDs to assign the waiter to',
    example: [
      'a1111111-1111-1111-1111-111111111111',
      'a2222222-2222-2222-2222-222222222222',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one table ID is required' })
  @IsUUID('4', { each: true, message: 'Each table_id must be a valid UUID' })
  table_ids: string[];
}
