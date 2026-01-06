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
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MenuItemStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  SOLD_OUT = 'sold_out',
}

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'Name of the menu item',
    example: 'Margherita Pizza',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'ID of the menu category this item belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiProperty({
    description: "Price of the menu item in the restaurant's currency",
    example: 15.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    description: 'Detailed description of the menu item',
    example:
      'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Preparation time in minutes',
    example: 20,
    minimum: 0,
    maximum: 240,
  })
  @IsNumber()
  @Min(0)
  @Max(240)
  @IsOptional()
  prep_time_minutes?: number;

  @ApiPropertyOptional({
    description: 'Current availability status of the menu item',
    example: MenuItemStatus.AVAILABLE,
    enum: MenuItemStatus,
  })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @ApiPropertyOptional({
    description: 'Whether this item is recommended by the chef',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_chef_recommended?: boolean;
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional({
    description: 'Name of the menu item',
    example: 'Margherita Pizza',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'ID of the menu category this item belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: "Price of the menu item in the restaurant's currency",
    example: 15.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Detailed description of the menu item',
    example:
      'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Preparation time in minutes',
    example: 20,
    minimum: 0,
    maximum: 240,
  })
  @IsNumber()
  @Min(0)
  @Max(240)
  @IsOptional()
  prep_time_minutes?: number;

  @ApiPropertyOptional({
    description: 'Current availability status of the menu item',
    example: MenuItemStatus.AVAILABLE,
    enum: MenuItemStatus,
  })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @ApiPropertyOptional({
    description: 'Whether this item is recommended by the chef',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_chef_recommended?: boolean;
}

export class MenuItemQueryDto {
  @ApiPropertyOptional({
    description: 'Search query to filter menu items by name or description',
    example: 'pizza',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by menu category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by menu item status',
    example: MenuItemStatus.AVAILABLE,
    enum: MenuItemStatus,
  })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @ApiPropertyOptional({
    description: 'Sort field for the results',
    example: 'createdAt',
    enum: ['name', 'price', 'createdAt', 'popularity'],
  })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'price' | 'createdAt' | 'popularity';

  @ApiPropertyOptional({
    description: 'Sort order for the results',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

export class AttachModifierGroupsDto {
  @ApiProperty({
    description: 'Array of modifier group IDs to attach to the menu item',
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    type: [String],
  })
  @IsUUID(undefined, { each: true })
  group_ids: string[];
}
