import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Full name cannot be empty' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  full_name?: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;
}
