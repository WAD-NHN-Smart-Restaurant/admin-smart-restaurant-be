import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  IsEnum,
  IsPositive,
} from 'class-validator';

export enum MenuItemStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  SOLD_OUT = 'sold_out',
}

export class CreateMenuItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(240)
  @IsOptional()
  prep_time_minutes?: number;

  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @IsBoolean()
  @IsOptional()
  is_chef_recommended?: boolean;
}

export class UpdateMenuItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(240)
  @IsOptional()
  prep_time_minutes?: number;

  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @IsBoolean()
  @IsOptional()
  is_chef_recommended?: boolean;
}

export class MenuItemQueryDto {
  @IsString()
  @IsOptional()
  q?: string; // search query

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @IsString()
  @IsOptional()
  sort?: 'name' | 'price_asc' | 'price_desc' | 'created_at';

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class AttachModifierGroupsDto {
  @IsUUID(undefined, { each: true })
  group_ids: string[];
}
