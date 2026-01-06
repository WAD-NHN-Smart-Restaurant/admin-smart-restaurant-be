import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierSelectionType, ModifierStatus } from './modifier.enums';

export class UpdateModifierGroupDto {
  @ApiPropertyOptional({
    description: 'Modifier group name',
    example: 'Topping Options',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Selection type for the modifier group',
    enum: ModifierSelectionType,
    example: ModifierSelectionType.MULTIPLE,
  })
  @IsEnum(ModifierSelectionType)
  @IsOptional()
  selection_type?: ModifierSelectionType;

  @ApiPropertyOptional({
    description: 'Whether this modifier group is required',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum number of selections required',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  min_selections?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of selections allowed',
    example: 5,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  max_selections?: number;

  @ApiPropertyOptional({
    description: 'Display order for sorting modifier groups',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Modifier group status',
    enum: ModifierStatus,
    example: ModifierStatus.ACTIVE,
  })
  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus;
}
