import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TableStatus } from './create-table.dto';

export class UpdateTableStatusDto {
  @ApiProperty({
    description: 'New status for the table',
    enum: TableStatus,
    example: TableStatus.INACTIVE,
  })
  @IsEnum(TableStatus, {
    message: 'Status must be available, occupied, or inactive',
  })
  status: TableStatus;
}
