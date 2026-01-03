import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MenuItemRepository } from './menu-item.repository';
import { StorageService } from '../storage/storage.service';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemQueryDto,
  AttachModifierGroupsDto,
  MenuItemStatus,
} from './dto/menu-item.dto';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
import { ModifierGroupRepository } from '../modifier-group/modifier-group.repository';
import { MenuCategoryRepository } from '../menu-category/menu-category.repository';

@Injectable()
export class MenuItemService {
  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly storageService: StorageService,
    private readonly modifierGroupRepository: ModifierGroupRepository,
    private readonly categoryRepository: MenuCategoryRepository,
  ) {}

  // Menu Items CRUD operations
  async createMenuItem(restaurantId: string, createDto: CreateMenuItemDto) {
    try {
      // Validate category belongs to restaurant
      if (createDto.category_id) {
        await this.categoryRepository.validateCategoryBelongsToRestaurant(
          createDto.category_id,
          restaurantId,
        );
      }

      const itemData = {
        ...createDto,
        status: createDto.status || MenuItemStatus.AVAILABLE,
      };

      return await this.menuItemRepository.createMenuItem(
        restaurantId,
        itemData,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to create menu item: ${error.message}`,
      );
    }
  }

  async getMenuItem(id: string, restaurantId: string) {
    const item = await this.menuItemRepository.findMenuItemById(
      id,
      restaurantId,
    );
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
    console.log('🔍 Debug - service updateMenuItem called', {
      id,
      restaurantId,
      updateDto,
    });

    // Check if item exists (simple check without complex joins)
    const exists = await this.menuItemRepository.checkMenuItemExists(
      id,
      restaurantId,
    );
    if (!exists) {
      throw new NotFoundException('Menu item not found');
    }

    // Validate category belongs to restaurant if category_id is being updated
    if (updateDto.category_id) {
      await this.categoryRepository.validateCategoryBelongsToRestaurant(
        updateDto.category_id,
        restaurantId,
      );
    }

    const result = await this.menuItemRepository.updateMenuItem(
      id,
      restaurantId,
      updateDto,
    );

    console.log('🔍 Debug - service updateMenuItem result', result);
    return result;
  }

  async deleteMenuItem(id: string, restaurantId: string) {
    // Check if item exists
    await this.getMenuItem(id, restaurantId);

    try {
      return await this.menuItemRepository.softDeleteMenuItem(id, restaurantId);
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
      await this.menuItemRepository.findMenuItemPhotos(menuItemId);
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

        const uploadedPhoto = await this.menuItemRepository.createMenuItemPhoto(
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

    return await this.menuItemRepository.findMenuItemPhotos(menuItemId);
  }

  async deleteMenuItemPhoto(
    menuItemId: string,
    photoId: string,
    restaurantId: string,
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    // Find the photo to get the storage key
    const photos = await this.menuItemRepository.findMenuItemPhotos(menuItemId);
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
      return await this.menuItemRepository.deleteMenuItemPhoto(
        photoId,
        menuItemId,
      );
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
      return await this.menuItemRepository.setPrimaryPhoto(photoId, menuItemId);
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
      await this.modifierGroupRepository.validateModifierGroupBelongsToRestaurant(
        groupId,
        restaurantId,
      );
    }

    try {
      return await this.menuItemRepository.attachModifierGroupsToItem(
        menuItemId,
        attachDto.group_ids,
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to attach modifier groups: ${error.message}`,
      );
    }
  }

  // Guest Menu operations
  async getGuestMenu(query: GuestMenuQueryDto, restaurantId: string) {
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }
    try {
      return await this.menuItemRepository.getGuestMenu(restaurantId, query);
    } catch (error) {
      throw new BadRequestException(
        `Failed to load guest menu: ${error.message}`,
      );
    }
  }

  // --- Admin Items List ---
  async getAdminMenuItems(restaurantId: string, queryDto: MenuItemQueryDto) {
    const result = await this.menuItemRepository.getAdminMenuItems(
      restaurantId,
      queryDto,
    );
    const { data, count, page, limit } = result;

    return {
      items: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }
}
