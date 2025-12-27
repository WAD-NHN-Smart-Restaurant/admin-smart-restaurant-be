import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemQueryDto,
  AttachModifierGroupsDto,
} from './dto/menu-item.dto';
import {
  MenuItemResponseDto,
  MenuItemsListResponseDto,
  MenuCategoryResponseDto,
  MenuCategoriesListResponseDto,
} from './dto/menu-response.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryStatus,
} from './dto/menu-category.dto';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
} from './dto/modifier.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Menu - Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Admin Menu Items APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('items')
  @ApiOperation({
    summary: 'Create a new menu item',
    description:
      'Creates a new menu item with the provided details. Requires admin authentication.',
  })
  @ApiBody({ type: CreateMenuItemDto })
  @ApiResponse({
    status: 201,
    description: 'Menu item created successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async createMenuItem(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateMenuItemDto,
  ) {
    return this.menuService.createMenuItem(restaurantId, createDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('items/:id')
  @ApiOperation({
    summary: 'Get a specific menu item',
    description:
      'Retrieves detailed information about a specific menu item by ID. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu item retrieved successfully',
    type: MenuItemResponseDto,
    example: {
      success: true,
      data: {
        id: '9b141a51-9abd-494c-828d-e668917b7119',
        restaurantId: 'c6fc043d-0b6f-4bf0-bb73-a8fc93b28106',
        categoryId: 'd9c78f47-aa10-4fb3-b789-01b930551fd7',
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with a rich molten center.',
        price: 7.99,
        prepTimeMinutes: 15,
        status: 'available',
        isChefRecommended: true,
        isDeleted: false,
        createdAt: '2025-12-25T13:47:37.14068+00:00',
        updatedAt: '2025-12-25T13:47:37.14068+00:00',
        menuCategories: {
          name: 'Dessert',
        },
        menuItemPhotos: [
          {
            id: 'e0fd7fdb-781b-432f-908d-21344a0a8b10',
            menuItemId: '9b141a51-9abd-494c-828d-e668917b7119',
            url: 'https://94f5448449ef5d0af4d63029a1fd354f.r2.cloudflarestorage.com/menu-images/menu-items/9b141a51-9abd-494c-828d-e668917b7119/7448006a-27d5-4d93-b608-e82ea0ca507f.jpg',
            storageKey: 'menu-items/9b141a51-9abd-494c-828d-e668917b7119/7448006a-27d5-4d93-b608-e82ea0ca507f.jpg',
            isPrimary: true,
            createdAt: '2025-12-25T15:54:43.334953+00:00',
          },
        ],
        menuItemModifierGroups: [
          {
            modifierGroups: {
              id: '64de4a84-fd21-4316-9e14-7861bcfa61fe',
              name: 'Extra Toppings',
              status: 'active',
              createdAt: '2025-12-25T14:10:27.864839+00:00',
              updatedAt: '2025-12-26T18:47:49.999346+00:00',
              isRequired: false,
              displayOrder: 2,
              restaurantId: 'c6fc043d-0b6f-4bf0-bb73-a8fc93b28106',
              maxSelections: 1,
              minSelections: 0,
              selectionType: 'multiple',
              modifierOptions: [
                {
                  id: '943b6460-35dc-448f-b97e-57fb8cecd8ea',
                  groupId: '64de4a84-fd21-4316-9e14-7861bcfa61fe',
                  name: 'Chocolate Sauce',
                  priceAdjustment: 0.75,
                  status: 'active',
                  createdAt: '2025-12-25T14:11:07.595169+00:00',
                },
              ],
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.getMenuItem(id, restaurantId);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put('items/:id')
  @ApiOperation({
    summary: 'Update a menu item',
    description:
      'Updates an existing menu item with the provided details. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateMenuItemDto })
  @ApiResponse({
    status: 200,
    description: 'Menu item updated successfully',
    type: MenuItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async updateMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateMenuItemDto,
  ) {
    console.log('🔍 Debug - updateMenuItem called', { id, restaurantId, updateDto });
    return this.menuService.updateMenuItem(id, restaurantId, updateDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Delete('items/:id')
  @ApiOperation({
    summary: 'Delete a menu item',
    description:
      'Soft deletes a menu item by ID. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu item deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async deleteMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.deleteMenuItem(id, restaurantId);
  }

  // Menu Item Photos APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('items/:id/photos')
  @ApiOperation({
    summary: 'Upload photos for a menu item',
    description:
      'Uploads multiple photos for a menu item. Supports up to 10 files. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Photo files to upload',
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Array of photo files (max 10 files)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photos uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid files or menu item not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  ) // Allow up to 10 files
  async uploadMenuItemPhotos(
    @Param('id') menuItemId: string,
    @GetRestaurantId() restaurantId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.menuService.uploadMenuItemPhotos(
      menuItemId,
      restaurantId,
      files,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('items/:id/photos')
  @ApiOperation({
    summary: 'Get photos for a menu item',
    description:
      'Retrieves all photos associated with a specific menu item. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Photos retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async getMenuItemPhotos(
    @Param('id') menuItemId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.getMenuItemPhotos(menuItemId, restaurantId);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Delete('items/:menuItemId/photos/:photoId')
  @ApiOperation({
    summary: 'Delete a menu item photo',
    description:
      'Deletes a specific photo from a menu item. Requires admin authentication.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'photoId',
    description: 'Photo ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Photo deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item or photo not found' })
  async deleteMenuItemPhoto(
    @Param('menuItemId') menuItemId: string,
    @Param('photoId') photoId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.deleteMenuItemPhoto(
      menuItemId,
      photoId,
      restaurantId,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Patch('items/:menuItemId/photos/:photoId/primary')
  @ApiOperation({
    summary: 'Set primary photo for menu item',
    description:
      'Sets a specific photo as the primary photo for a menu item. Requires admin authentication.',
  })
  @ApiParam({
    name: 'menuItemId',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'photoId',
    description: 'Photo ID to set as primary',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary photo set successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item or photo not found' })
  async setPrimaryPhoto(
    @Param('menuItemId') menuItemId: string,
    @Param('photoId') photoId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.setPrimaryPhoto(menuItemId, photoId, restaurantId);
  }

  // Modifier Groups APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('items/:id/modifier-groups')
  @ApiOperation({
    summary: 'Attach modifier groups to menu item',
    description:
      'Attaches modifier groups to a menu item for customization options. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Menu item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: AttachModifierGroupsDto })
  @ApiResponse({
    status: 201,
    description: 'Modifier groups attached successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async attachModifierGroupsToItem(
    @Param('id') menuItemId: string,
    @GetRestaurantId() restaurantId: string,
    @Body() attachDto: AttachModifierGroupsDto,
  ) {
    return this.menuService.attachModifierGroupsToItem(
      menuItemId,
      restaurantId,
      attachDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('modifier-groups')
  @ApiOperation({
    summary: 'Get modifier groups',
    description:
      'Retrieves all modifier groups for the restaurant. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier groups retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getModifierGroups(@GetRestaurantId() restaurantId: string) {
    return this.menuService.getModifierGroups(restaurantId);
  }

  // ==========================================
  // DEV B IMPLEMENTATION
  // ==========================================

  // 1. Menu Categories APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('categories')
  @ApiOperation({
    summary: 'Get menu categories',
    description:
      'Retrieves all menu categories for the restaurant with optional filtering and sorting. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: MenuCategoriesListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getCategories(
    @GetRestaurantId() restaurantId: string,
    @Query() query: CategoryQueryDto,
  ) {
    return this.menuService.getCategories(restaurantId, query);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('categories')
  @ApiOperation({
    summary: 'Create menu category',
    description:
      'Creates a new menu category for the restaurant. Requires admin authentication.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async createCategory(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateCategoryDto,
  ) {
    // Debug logging
    console.log('🔍 Debug - createCategory called');
    console.log('Restaurant ID from decorator:', restaurantId);
    console.log('Request user:', (this as any).request?.user);

    return this.menuService.createCategory(restaurantId, createDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put('categories/:id')
  @ApiOperation({
    summary: 'Update menu category',
    description:
      'Updates an existing menu category. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, restaurantId, updateDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Patch('categories/:id/status')
  @ApiOperation({
    summary: 'Update category status',
    description:
      'Updates the status of a menu category (active/inactive). Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          example: 'active',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category status updated successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid status' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategoryStatus(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body('status') status: CategoryStatus, // Simple body: { "status": "active" }
  ) {
    return this.menuService.updateCategoryStatus(id, restaurantId, status);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Delete('categories/:id')
  @ApiOperation({
    summary: 'Delete menu category',
    description: 'Soft deletes a menu category. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.deleteCategory(id, restaurantId);
  }

  // 2. Menu Items List API (Admin)
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('items')
  @ApiOperation({
    summary: 'Get admin menu items',
    description:
      'Retrieves all menu items for the restaurant with optional filtering and sorting. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu items retrieved successfully',
    type: MenuItemsListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getAdminMenuItems(
    @GetRestaurantId() restaurantId: string,
    @Query() query: MenuItemQueryDto,
  ) {
    return this.menuService.getAdminMenuItems(restaurantId, query);
  }

  // 4. Menu Item Modifiers APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('modifier-groups')
  @ApiOperation({
    summary: 'Create modifier group',
    description:
      'Creates a new modifier group for menu item customization. Requires admin authentication.',
  })
  @ApiBody({ type: CreateModifierGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Modifier group created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async createModifierGroup(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierGroupDto,
  ) {
    return this.menuService.createModifierGroup(restaurantId, createDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put('modifier-groups/:id')
  @ApiOperation({
    summary: 'Update modifier group',
    description:
      'Updates an existing modifier group. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateModifierGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Modifier group updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Modifier group not found' })
  async updateModifierGroup(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return this.menuService.updateModifierGroup(id, restaurantId, updateDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('modifier-groups/:id/options')
  @ApiOperation({
    summary: 'Create modifier option',
    description:
      'Creates a new modifier option for a modifier group. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: CreateModifierOptionDto })
  @ApiResponse({
    status: 201,
    description: 'Modifier option created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Modifier group not found' })
  async createModifierOption(
    @Param('id') groupId: string,
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierOptionDto,
  ) {
    return this.menuService.createModifierOption(
      groupId,
      restaurantId,
      createDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put('modifier-options/:id')
  @ApiOperation({
    summary: 'Update modifier option',
    description:
      'Updates an existing modifier option. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier option ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({ type: UpdateModifierOptionDto })
  @ApiResponse({
    status: 200,
    description: 'Modifier option updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Modifier option not found' })
  async updateModifierOption(
    @Param('id') optionId: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateModifierOptionDto,
  ) {
    return this.menuService.updateModifierOption(
      optionId,
      restaurantId,
      updateDto,
    );
  }
}
