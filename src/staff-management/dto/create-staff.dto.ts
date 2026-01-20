import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export enum StaffRole {
  ADMIN = 'admin',
  WAITER = 'waiter',
  KITCHEN_STAFF = 'kitchen_staff',
}

export class CreateStaffDto {
  @ApiProperty({
    description: 'Staff member email address',
    example: 'john.doe@restaurant.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Staff member full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description:
      'Default password for new staff account (optional, will use system default if not provided)',
    example: 'TempPassword123!',
  })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateAdminDto extends CreateStaffDto {}

export class CreateWaiterDto extends CreateStaffDto {}

export class CreateKitchenStaffDto extends CreateStaffDto {}
