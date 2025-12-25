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

export enum ModifierSelectionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum ModifierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateModifierGroupDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsEnum(ModifierSelectionType)
  selection_type: ModifierSelectionType;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean = false;

  @IsInt()
  @Min(0)
  @IsOptional()
  min_selections?: number = 0;

  @IsInt()
  @Min(0)
  @IsOptional()
  max_selections?: number = 0;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number = 0;
}

export class UpdateModifierGroupDto {
  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @IsEnum(ModifierSelectionType)
  @IsOptional()
  selection_type?: ModifierSelectionType;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  min_selections?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  max_selections?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus;
}

export class CreateModifierOptionDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price_adjustment?: number = 0;

  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus = ModifierStatus.ACTIVE;
}

export class UpdateModifierOptionDto {
  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price_adjustment?: number;

  @IsEnum(ModifierStatus)
  @IsOptional()
  status?: ModifierStatus;
}
