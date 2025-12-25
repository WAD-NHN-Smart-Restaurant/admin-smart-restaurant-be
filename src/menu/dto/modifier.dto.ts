import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModifierSelectionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum ModifierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateModifierGroupDto {
  @ApiProperty({
    description: 'Modifier group name',
    example: 'Size Options',
    maxLength: 80,
  })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    description: 'Selection type for the modifier group',
    enum: ModifierSelectionType,
    example: ModifierSelectionType.SINGLE,
  })
  @IsEnum(ModifierSelectionType)
  selection_type: ModifierSelectionType;

  @ApiPropertyOptional({
    description: 'Whether this modifier group is required',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_required?: boolean = false;

  @ApiPropertyOptional({
    description: 'Minimum number of selections required',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  min_selections?: number = 0;

  @ApiPropertyOptional({
    description: 'Maximum number of selections allowed',
    example: 3,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  max_selections?: number = 0;

  @ApiPropertyOptional({
    description: 'Display order for sorting modifier groups',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number = 0;
}

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

export class CreateModifierOptionDto {
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
