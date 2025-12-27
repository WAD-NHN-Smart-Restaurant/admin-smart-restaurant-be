import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemStatus } from './menu-item.dto';

export class MenuItemPhotoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  menuItemId: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  storageKey?: string;

  @ApiPropertyOptional()
  isPrimary?: boolean;

  @ApiProperty()
  createdAt: string;
}

export class ModifierOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  priceAdjustment?: number;

  @ApiPropertyOptional()
  status?: string;

  @ApiProperty()
  createdAt: string;
}

export class ModifierGroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  selectionType: string;

  @ApiPropertyOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  minSelections?: number;

  @ApiPropertyOptional()
  maxSelections?: number;

  @ApiPropertyOptional()
  displayOrder?: number;

  @ApiPropertyOptional()
  status?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [ModifierOptionResponseDto] })
  modifierOptions: ModifierOptionResponseDto[];
}

export class MenuCategoryNestedResponseDto {
  @ApiProperty()
  name: string;
}

export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  prepTimeMinutes?: number;

  @ApiProperty()
  status: MenuItemStatus;

  @ApiPropertyOptional()
  isChefRecommended?: boolean;

  @ApiPropertyOptional()
  isDeleted?: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: MenuCategoryNestedResponseDto })
  menuCategories: MenuCategoryNestedResponseDto;

  @ApiProperty({ type: [MenuItemPhotoResponseDto] })
  menuItemPhotos: MenuItemPhotoResponseDto[];

  @ApiProperty({ type: [ModifierGroupResponseDto] })
  menuItemModifierGroups: ModifierGroupResponseDto[];
}

export class MenuCategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  display_order?: number;

  @ApiProperty()
  restaurant_id: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class MenuItemsListResponseDto {
  @ApiProperty({ type: [MenuItemResponseDto] })
  items: MenuItemResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MenuCategoriesListResponseDto {
  @ApiProperty({ type: [MenuCategoryResponseDto] })
  items: MenuCategoryResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
