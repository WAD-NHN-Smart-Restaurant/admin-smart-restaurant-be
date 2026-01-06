import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModifierSelectionType, ModifierStatus } from './modifier.enums';

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

  @ApiPropertyOptional({
    description: 'Status of the modifier group',
    enum: ModifierStatus,
    example: ModifierStatus.ACTIVE,
  })
  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus = ModifierStatus.ACTIVE;
}
