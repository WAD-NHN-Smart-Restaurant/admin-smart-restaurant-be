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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemQueryDto,
  AttachModifierGroupsDto,
} from './dto/menu-item.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
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

@Controller('admin/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Admin Menu Items APIs
  @UseGuards(AdminGuard)
  @Post('items')
  async createMenuItem(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateMenuItemDto,
  ) {
    return this.menuService.createMenuItem(restaurantId, createDto);
  }

  @UseGuards(AdminGuard)
  @Get('items/:id')
  async getMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.getMenuItem(id, restaurantId);
  }

  @UseGuards(AdminGuard)
  @Put('items/:id')
  async updateMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(id, restaurantId, updateDto);
  }

  @UseGuards(AdminGuard)
  @Delete('items/:id')
  async deleteMenuItem(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.deleteMenuItem(id, restaurantId);
  }

  // Menu Item Photos APIs
  @UseGuards(AdminGuard)
  @Post('items/:id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10)) // Allow up to 10 files
  async uploadMenuItemPhotos(
    @Param('id') menuItemId: string,
    @GetRestaurantId() restaurantId: string,
    @UploadedFiles() files: any[],
  ) {
    // For now, we'll assume files are uploaded and URLs are provided
    // In a real implementation, you'd upload to cloud storage and get URLs
    const photos = files.map((file) => ({
      url: `/uploads/${file.filename}`, // This would be the actual URL
      is_primary: false,
    }));

    return this.menuService.uploadMenuItemPhotos(
      menuItemId,
      restaurantId,
      photos,
    );
  }

  @UseGuards(AdminGuard)
  @Get('items/:id/photos')
  async getMenuItemPhotos(
    @Param('id') menuItemId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.getMenuItemPhotos(menuItemId, restaurantId);
  }

  @UseGuards(AdminGuard)
  @Delete('items/:menuItemId/photos/:photoId')
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

  @UseGuards(AdminGuard)
  @Patch('items/:menuItemId/photos/:photoId/primary')
  async setPrimaryPhoto(
    @Param('menuItemId') menuItemId: string,
    @Param('photoId') photoId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.setPrimaryPhoto(menuItemId, photoId, restaurantId);
  }

  // Modifier Groups APIs
  @UseGuards(AdminGuard)
  @Post('items/:id/modifier-groups')
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

  @UseGuards(AdminGuard)
  @Get('modifier-groups')
  async getModifierGroups(@GetRestaurantId() restaurantId: string) {
    return this.menuService.getModifierGroups(restaurantId);
  }

  // ==========================================
  // DEV B IMPLEMENTATION
  // ==========================================

  // 1. Menu Categories APIs
  @UseGuards(AdminGuard)
  @Get('categories')
  async getCategories(
    @GetRestaurantId() restaurantId: string,
    @Query() query: CategoryQueryDto,
  ) {
    return this.menuService.getCategories(restaurantId, query);
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  async createCategory(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateCategoryDto,
  ) {
    return this.menuService.createCategory(restaurantId, createDto);
  }

  @UseGuards(AdminGuard)
  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, restaurantId, updateDto);
  }

  @UseGuards(AdminGuard)
  @Patch('categories/:id/status')
  async updateCategoryStatus(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body('status') status: CategoryStatus, // Simple body: { "status": "active" }
  ) {
    return this.menuService.updateCategoryStatus(id, restaurantId, status);
  }

  @UseGuards(AdminGuard)
  @Delete('categories/:id')
  async deleteCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuService.deleteCategory(id, restaurantId);
  }

  // 2. Menu Items List API (Admin)
  @UseGuards(AdminGuard)
  @Get('items')
  async getAdminMenuItems(
    @GetRestaurantId() restaurantId: string,
    @Query() query: MenuItemQueryDto,
  ) {
    return this.menuService.getAdminMenuItems(restaurantId, query);
  }

  // 4. Menu Item Modifiers APIs
  @UseGuards(AdminGuard)
  @Post('modifier-groups')
  async createModifierGroup(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierGroupDto,
  ) {
    return this.menuService.createModifierGroup(restaurantId, createDto);
  }

  @UseGuards(AdminGuard)
  @Put('modifier-groups/:id')
  async updateModifierGroup(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return this.menuService.updateModifierGroup(id, restaurantId, updateDto);
  }

  @UseGuards(AdminGuard)
  @Post('modifier-groups/:id/options')
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

  @UseGuards(AdminGuard)
  @Put('modifier-options/:id')
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
