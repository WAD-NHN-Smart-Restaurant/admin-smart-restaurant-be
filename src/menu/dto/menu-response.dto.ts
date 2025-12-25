import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MenuItemStatus } from './menu-item.dto';

export class MenuItemPhotoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  is_primary?: boolean;

  @ApiPropertyOptional()
  display_order?: number;

  @ApiProperty()
  created_at: string;
}

export class ModifierOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  is_available: boolean;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class ModifierGroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  is_required: boolean;

  @ApiProperty()
  max_selections: number;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ type: [ModifierOptionResponseDto] })
  modifier_options: ModifierOptionResponseDto[];
}

export class MenuItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  status: MenuItemStatus;

  @ApiProperty()
  is_chef_recommended: boolean;

  @ApiPropertyOptional()
  category_id?: string;

  @ApiProperty()
  restaurant_id: string;

  @ApiProperty({ type: [MenuItemPhotoResponseDto] })
  menu_item_photos: MenuItemPhotoResponseDto[];

  @ApiProperty({ type: [ModifierGroupResponseDto] })
  menu_item_modifier_groups: ModifierGroupResponseDto[];

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
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
