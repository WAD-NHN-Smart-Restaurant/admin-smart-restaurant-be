import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import { StorageService } from '../storage/storage.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemQueryDto,
  AttachModifierGroupsDto,
  MenuItemStatus,
} from './dto/menu-item.dto';
import { CreateMenuItemPhotoDto } from './dto/menu-photo.dto';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
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

interface DbError {
  code?: string;
  message?: string;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly menuRepository: MenuRepository,
    private readonly storageService: StorageService,
  ) {}

  // Menu Items CRUD operations
  async createMenuItem(restaurantId: string, createDto: CreateMenuItemDto) {
    try {
      // Validate category belongs to restaurant
      if (createDto.category_id) {
        await this.validateCategoryBelongsToRestaurant(
          createDto.category_id,
          restaurantId,
        );
      }

      const itemData = {
        ...createDto,
        status: createDto.status || MenuItemStatus.AVAILABLE,
      };

      return await this.menuRepository.createMenuItem(restaurantId, itemData);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create menu item: ${error.message}`,
      );
    }
  }

  async getMenuItem(id: string, restaurantId: string) {
    const item = await this.menuRepository.findMenuItemById(id, restaurantId);
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async updateMenuItem(
    id: string,
    restaurantId: string,
    updateDto: UpdateMenuItemDto,
  ) {
    // Check if item exists
    await this.getMenuItem(id, restaurantId);

    // Validate category belongs to restaurant if category_id is being updated
    if (updateDto.category_id) {
      await this.validateCategoryBelongsToRestaurant(
        updateDto.category_id,
        restaurantId,
      );
    }

    try {
      return await this.menuRepository.updateMenuItem(
        id,
        restaurantId,
        updateDto,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to update menu item: ${error.message}`,
      );
    }
  }

  async deleteMenuItem(id: string, restaurantId: string) {
    // Check if item exists
    await this.getMenuItem(id, restaurantId);

    try {
      return await this.menuRepository.softDeleteMenuItem(id, restaurantId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete menu item: ${error.message}`,
      );
    }
  }

  // Menu Item Photos operations
  async uploadMenuItemPhotos(
    menuItemId: string,
    restaurantId: string,
    files: Express.Multer.File[],
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    // Check if there are already photos for this item
    const existingPhotos =
      await this.menuRepository.findMenuItemPhotos(menuItemId);
    const hasPrimary = existingPhotos.some((p) => p.is_primary);

    const uploadedPhotos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to R2
        const folder = `menu-items/${menuItemId}`;
        const { url, key } = await this.storageService.uploadFile(file, folder);

        // Save to DB
        // First photo becomes primary if no primary exists
        const isPrimary = !hasPrimary && i === 0;

        const photoData = {
          url,
          storage_key: key,
          is_primary: isPrimary,
        };

        const uploadedPhoto = await this.menuRepository.createMenuItemPhoto(
          menuItemId,
          photoData,
        );
        uploadedPhotos.push(uploadedPhoto);
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload photo ${file.originalname}: ${error.message}`,
        );
      }
    }

    return uploadedPhotos;
  }

  async getMenuItemPhotos(menuItemId: string, restaurantId: string) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    return await this.menuRepository.findMenuItemPhotos(menuItemId);
  }

  async deleteMenuItemPhoto(
    menuItemId: string,
    photoId: string,
    restaurantId: string,
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    // Find the photo to get the storage key
    const photos = await this.menuRepository.findMenuItemPhotos(menuItemId);
    const photoToDelete = photos.find((p) => p.id === photoId);

    if (!photoToDelete) {
      throw new NotFoundException('Photo not found');
    }

    try {
      // Delete from R2 if storage_key exists
      if (photoToDelete.storage_key) {
        await this.storageService.deleteFile(photoToDelete.storage_key);
      }

      // Delete from DB
      return await this.menuRepository.deleteMenuItemPhoto(photoId, menuItemId);
    } catch (error) {
      throw new BadRequestException(`Failed to delete photo: ${error.message}`);
    }
  }

  async setPrimaryPhoto(
    menuItemId: string,
    photoId: string,
    restaurantId: string,
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    try {
      return await this.menuRepository.setPrimaryPhoto(photoId, menuItemId);
    } catch (error) {
      throw new NotFoundException(
        'Photo not found or does not belong to this menu item',
      );
    }
  }

  // Modifier Groups operations
  async attachModifierGroupsToItem(
    menuItemId: string,
    restaurantId: string,
    attachDto: AttachModifierGroupsDto,
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    // Validate that all modifier groups belong to the restaurant
    for (const groupId of attachDto.group_ids) {
      await this.validateModifierGroupBelongsToRestaurant(
        groupId,
        restaurantId,
      );
    }

    try {
      return await this.menuRepository.attachModifierGroupsToItem(
        menuItemId,
        attachDto.group_ids,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to attach modifier groups: ${error.message}`,
      );
    }
  }

  async getModifierGroups(restaurantId: string) {
    return await this.menuRepository.findModifierGroupsByRestaurant(
      restaurantId,
    );
  }

  // Guest Menu operations
  async getGuestMenu(restaurantId: string, queryDto: GuestMenuQueryDto) {
    try {
      return await this.menuRepository.getGuestMenu(restaurantId, queryDto);
    } catch (error) {
      throw new BadRequestException(
        `Failed to load guest menu: ${error.message}`,
      );
    }
  }

  // Validation helpers
  private async validateCategoryBelongsToRestaurant(
    categoryId: string,
    restaurantId: string,
  ) {
    return await this.menuRepository.validateCategoryBelongsToRestaurant(
      categoryId,
      restaurantId,
    );
  }

  private async validateModifierGroupBelongsToRestaurant(
    groupId: string,
    restaurantId: string,
  ) {
    return await this.menuRepository.validateModifierGroupBelongsToRestaurant(
      groupId,
      restaurantId,
    );
  }

  // ==========================================
  // DEV B IMPLEMENTATION
  // ==========================================

  // --- Categories ---
  async getCategories(restaurantId: string, query: CategoryQueryDto) {
    return await this.menuRepository.getCategories(restaurantId, query);
  }

  async createCategory(restaurantId: string, createDto: CreateCategoryDto) {
    try {
      // DTO fields khớp với DB columns (snake_case)
      return await this.menuRepository.createCategory(restaurantId, createDto);
    } catch (error) {
      const err = error as DbError;
      // Bắt lỗi Unique Constraint (restaurant_id, name)
      if (err.code === '23505') {
        throw new BadRequestException(
          'Category name already exists in this restaurant',
        );
      }
      throw new BadRequestException(
        `Failed to create category: ${err.message}`,
      );
    }
  }

  async updateCategory(
    id: string,
    restaurantId: string,
    updateDto: UpdateCategoryDto,
  ) {
    await this.getCategory(id, restaurantId); // Check exists
    try {
      return await this.menuRepository.updateCategory(
        id,
        restaurantId,
        updateDto,
      );
    } catch (error) {
      const err = error as DbError;
      if (err.code === '23505') {
        throw new BadRequestException('Category name already exists');
      }
      throw new BadRequestException(
        `Failed to update category: ${err.message}`,
      );
    }
  }

  async updateCategoryStatus(
    id: string,
    restaurantId: string,
    status: CategoryStatus,
  ) {
    return this.updateCategory(id, restaurantId, { status });
  }

  async getCategory(id: string, restaurantId: string) {
    const category = await this.menuRepository.findCategoryById(
      id,
      restaurantId,
    );
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async deleteCategory(id: string, restaurantId: string) {
    await this.getCategory(id, restaurantId);

    // Business Rule: Không xóa nếu có món active
    const activeItemsCount =
      await this.menuRepository.countActiveItemsInCategory(id);

    // [FIX] activeItemsCount có thể là null, dùng ?? 0 để an toàn
    if ((activeItemsCount ?? 0) > 0) {
      throw new BadRequestException(
        'Cannot delete category containing active menu items. Please move or delete items first.',
      );
    }

    return await this.menuRepository.deleteCategory(id, restaurantId);
  }

  // --- Admin Items List ---
  async getAdminMenuItems(restaurantId: string, queryDto: MenuItemQueryDto) {
    return await this.menuRepository.getAdminMenuItems(restaurantId, queryDto);
  }

  // --- Modifier Groups & Options ---
  async createModifierGroup(
    restaurantId: string,
    createDto: CreateModifierGroupDto,
  ) {
    return await this.menuRepository.createModifierGroup(
      restaurantId,
      createDto,
    );
  }

  async updateModifierGroup(
    id: string,
    restaurantId: string,
    updateDto: UpdateModifierGroupDto,
  ) {
    const group = await this.menuRepository.findModifierGroupById(
      id,
      restaurantId,
    );
    if (!group) throw new NotFoundException('Modifier group not found');

    return await this.menuRepository.updateModifierGroup(
      id,
      restaurantId,
      updateDto,
    );
  }

  async createModifierOption(
    groupId: string,
    restaurantId: string,
    createDto: CreateModifierOptionDto,
  ) {
    // Phải kiểm tra groupId có thuộc restaurantId không trước khi insert option
    await this.validateModifierGroupBelongsToRestaurant(groupId, restaurantId);

    return await this.menuRepository.createModifierOption(groupId, createDto);
  }

  async updateModifierOption(
    optionId: string,
    restaurantId: string,
    updateDto: UpdateModifierOptionDto,
  ) {
    // Validate quyền sở hữu option (thông qua bảng modifier_groups)
    const isValid = await this.menuRepository.validateOptionBelongsToRestaurant(
      optionId,
      restaurantId,
    );
    if (!isValid)
      throw new NotFoundException('Modifier option not found or access denied');

    return await this.menuRepository.updateModifierOption(optionId, updateDto);
  }
}
