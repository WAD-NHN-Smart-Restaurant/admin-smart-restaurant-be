import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignWaiterDto {
  @ApiProperty({
    description: 'Waiter user ID or null to unassign',
    type: String,
    nullable: true,
    example: '8421eb25-ce93-4d47-8736-c4790ffea9dd',
  })
  @IsOptional()
  @IsUUID('4', { message: 'waiter_id must be a valid UUID' })
  waiter_id: string | null;
}
