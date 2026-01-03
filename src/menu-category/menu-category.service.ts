import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryStatus,
} from './dto/menu-category.dto';
import { MenuCategoryRepository } from './menu-category.repository';

interface DbError {
  code?: string;
  message?: string;
}

@Injectable()
export class MenuCategoryService {
  constructor(
    private readonly menuCategoryRepository: MenuCategoryRepository,
  ) {}

  async getCategories(restaurantId: string, query: CategoryQueryDto) {
    return await this.menuCategoryRepository.getCategories(restaurantId, query);
  }

  async createCategory(restaurantId: string, createDto: CreateCategoryDto) {
    try {
      // DTO fields khớp với DB columns (snake_case)
      return await this.menuCategoryRepository.createCategory(
        restaurantId,
        createDto,
      );
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
      return await this.menuCategoryRepository.updateCategory(
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
    const category = await this.menuCategoryRepository.findCategoryById(
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
      await this.menuCategoryRepository.countActiveItemsInCategory(id);

    // [FIX] activeItemsCount có thể là null, dùng ?? 0 để an toàn
    if ((activeItemsCount ?? 0) > 0) {
      throw new BadRequestException(
        'Cannot delete category containing active menu items. Please move or delete items first.',
      );
    }

    return await this.menuCategoryRepository.deleteCategory(id, restaurantId);
  }

  // Validation helpers
  private async validateCategoryBelongsToRestaurant(
    categoryId: string,
    restaurantId: string,
  ) {
    return await this.menuCategoryRepository.validateCategoryBelongsToRestaurant(
      categoryId,
      restaurantId,
    );
  }
}
