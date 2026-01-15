import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierStatus } from './modifier.enums';

export class CreateModifierOptionDto {
  @ApiProperty({
    description: 'Modifier group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID()
  group_id: string;

  @ApiProperty({
    description: 'Modifier option name',
    example: 'Extra Cheese',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'Price adjustment for this option',
    example: 2.5,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price_adjustment?: number = 0;

  @ApiPropertyOptional({
    description: 'Modifier option status',
    enum: ModifierStatus,
    example: ModifierStatus.ACTIVE,
  })
  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus = ModifierStatus.ACTIVE;
}
