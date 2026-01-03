import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import {
  Database,
  TablesInsert,
  TablesUpdate,
} from '../supabase/supabase.types';
import { CategoryQueryDto } from './dto/menu-category.dto';
import { mapSqlError } from '../utils/map-sql-error.util';
import { MenuCategoryStatus } from '../common/database-enums';

// Enum constants for magic strings
const MENU_CATEGORY_STATUS_ACTIVE: MenuCategoryStatus = 'active';
const MENU_CATEGORY_STATUS_INACTIVE: MenuCategoryStatus = 'inactive';

@Injectable()
export class MenuCategoryRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  async getCategories(restaurantId: string, filters: CategoryQueryDto) {
    // Sử dụng count để đếm số món active trong category
    // Note: This counts all menu items including deleted ones.
    // For accurate active item counts, we would need a more complex query.
    let query = this.supabase
      .from('menu_categories')
      .select('*, items_count:menu_items(count)')
      .eq('restaurant_id', restaurantId);

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // First get all data without sorting
    const { data, error } = await query;
    if (error) throw mapSqlError(error);

    // Sorting logic - handle itemCount sorting separately since Supabase doesn't support ordering by aggregated values
    const sortBy = filters.sortBy || 'displayOrder';
    const sortOrder = filters.sortOrder || 'asc';
    const ascending = sortOrder === 'asc';

    let sortedData = data;

    if (sortBy === 'name') {
      sortedData = data.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return ascending ? comparison : -comparison;
      });
    } else if (sortBy === 'displayOrder') {
      sortedData = data.sort((a, b) => {
        const comparison = (a.display_order || 0) - (b.display_order || 0);
        return ascending ? comparison : -comparison;
      });
    } else if (sortBy === 'createdAt') {
      sortedData = data.sort((a, b) => {
        const comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return ascending ? comparison : -comparison;
      });
    } else if (sortBy === 'itemCount') {
      sortedData = data.sort((a, b) => {
        const aCount = Number(a.items_count) || 0;
        const bCount = Number(b.items_count) || 0;
        // For itemCount, reverse the logic - 'desc' means ascending, 'asc' means descending
        if (ascending) {
          return bCount - aCount; // 'asc': higher count first
        } else {
          return aCount - bCount; // 'desc': lower count first
        }
      });
    } else {
      // Default: sort by display_order ascending
      sortedData = data.sort((a, b) => {
        const comparison = (a.display_order || 0) - (b.display_order || 0);
        return ascending ? comparison : -comparison;
      });
    }

    return sortedData;
  }

  // Sử dụng TablesInsert<'menu_categories'> để đảm bảo đúng field DB
  async createCategory(
    restaurantId: string,
    payload: Omit<TablesInsert<'menu_categories'>, 'restaurant_id'>,
  ) {
    const { data, error } = await this.supabase
      .from('menu_categories')
      .insert({
        ...payload,
        restaurant_id: restaurantId, // Gán restaurant_id từ token
      })
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async updateCategory(
    id: string,
    restaurantId: string,
    payload: TablesUpdate<'menu_categories'>,
  ) {
    const { data, error } = await this.supabase
      .from('menu_categories')
      .update(payload)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async findCategoryById(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('menu_categories')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async countActiveItemsInCategory(categoryId: string) {
    // is_deleted là boolean trong schema
    const { count, error } = await this.supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('is_deleted', false);

    if (error) throw mapSqlError(error);
    return count;
  }

  async deleteCategory(id: string, restaurantId: string) {
    // Soft delete: set status = MENU_CATEGORY_STATUS_INACTIVE
    const { data, error } = await this.supabase
      .from('menu_categories')
      .update({ status: MENU_CATEGORY_STATUS_INACTIVE })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  // Validation methods
  async validateCategoryBelongsToRestaurant(
    categoryId: string,
    restaurantId: string,
  ) {
    const { data, error } = await this.supabase
      .from('menu_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new Error(
        'Category not found or does not belong to this restaurant',
      );
    }
    return true;
  }
}
