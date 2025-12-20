import { IsEnum } from 'class-validator';
import { TableStatus } from './create-table.dto';

export class UpdateTableStatusDto {
  @IsEnum(TableStatus, {
    message: 'Status must be either active or inactive',
  })
  status: TableStatus;
}
