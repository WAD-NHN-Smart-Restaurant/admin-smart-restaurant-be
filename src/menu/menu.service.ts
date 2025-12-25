import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MenuRepository } from './menu.repository';
import {
  CreateMenuItemDto,
  UpdateMenuItemDto,
  MenuItemQueryDto,
  AttachModifierGroupsDto,
  MenuItemStatus,
} from './dto/menu-item.dto';
import { CreateMenuItemPhotoDto } from './dto/menu-photo.dto';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

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
    photos: CreateMenuItemPhotoDto[],
  ) {
    // Check if item exists and belongs to restaurant
    await this.getMenuItem(menuItemId, restaurantId);

    const uploadedPhotos = [];
    for (const photo of photos) {
      try {
        const uploadedPhoto = await this.menuRepository.createMenuItemPhoto(
          menuItemId,
          photo,
        );
        uploadedPhotos.push(uploadedPhoto);
      } catch (error) {
        throw new BadRequestException(
          `Failed to upload photo: ${error.message}`,
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

    try {
      return await this.menuRepository.deleteMenuItemPhoto(photoId, menuItemId);
    } catch (error) {
      throw new NotFoundException(
        'Photo not found or does not belong to this menu item',
      );
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
}
