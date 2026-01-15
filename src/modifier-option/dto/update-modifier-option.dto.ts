import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierStatus } from './modifier.enums';

export class UpdateModifierOptionDto {
  @ApiPropertyOptional({
    description: 'Modifier option name',
    example: 'Double Cheese',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Price adjustment for this option',
    example: 3.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price_adjustment?: number;

  @ApiPropertyOptional({
    description: 'Modifier option status',
    enum: ModifierStatus,
    example: ModifierStatus.ACTIVE,
  })
  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus;
}
