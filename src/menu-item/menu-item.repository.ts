import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { MenuItemQueryDto } from './dto/menu-item.dto';
import { mapSqlError } from '../utils/map-sql-error.util';
import { MenuCategoryStatus } from '../common/database-enums';

const MENU_CATEGORY_STATUS_ACTIVE: MenuCategoryStatus = 'active';
const MENU_MODIFIER_GROUPS_STATUS_ACTIVE: MenuCategoryStatus = 'active';
const MENU_MODIFIER_OPTIONS_STATUS_ACTIVE: MenuCategoryStatus = 'active';
const MENU_ITEM_STATUS_AVAILABLE = 'available';
const MENU_ITEM_STATUS_SOLD_OUT = 'sold_out';

export type MenuItemFilter = {
  search?: string;
  categoryId?: string;
  chefRecommended?: boolean;
  sortBy?: 'name' | 'price' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

@Injectable()
export class MenuItemRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  // ==========================================
  // HELPER METHODS FOR REUSABILITY
  // ==========================================

  // Apply common filters to menu item query
  private applyMenuItemFilters(
    query: any,
    filters: {
      search?: string;
      categoryId?: string;
      status?: string;
      chefRecommended?: boolean;
    },
    isGuestQuery: boolean = false,
  ) {
    let filteredQuery = query;

    if (filters.search) {
      filteredQuery = filteredQuery.ilike('name', `%${filters.search}%`);
    }

    if (filters.categoryId) {
      if (isGuestQuery) {
        filteredQuery = filteredQuery.eq(
          'menu_categories.id',
          filters.categoryId,
        );
      } else {
        filteredQuery = filteredQuery.eq('category_id', filters.categoryId);
      }
    }

    if (filters.status) {
      filteredQuery = filteredQuery.eq('status', filters.status);
    }

    if (filters.chefRecommended) {
      filteredQuery = filteredQuery.eq('is_chef_recommended', true);
    }

    return filteredQuery;
  }

  // Sort menu items by criteria
  private sortMenuItems(
    items: any[],
    sortBy?: string,
    sortOrder?: string,
  ): any[] {
    const sortByParam = sortBy || 'name';
    const sortOrderParam = sortOrder || 'asc';
    const ascending = sortOrderParam === 'asc';

    let sortedItems = [...items];

    switch (sortByParam) {
      case 'name':
        sortedItems.sort((a, b) =>
          ascending
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
        );
        break;

      case 'price':
        sortedItems.sort((a, b) =>
          ascending ? a.price - b.price : b.price - a.price,
        );
        break;

      case 'createdAt':
        sortedItems.sort((a, b) =>
          ascending
            ? new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
        );
        break;

      case 'popularity':
        sortedItems.sort((a, b) =>
          ascending ? a.popularity - b.popularity : b.popularity - a.popularity,
        );
        break;

      default:
        sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sortedItems;
  }

  // Paginate array of items
  private paginateItems<T>(
    items: T[],
    page: number = 1,
    limit: number = 20,
  ): {
    items: T[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  } {
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      totalPages,
      page,
      limit,
    };
  }

  // Add popularity scores to menu items using database function
  private async addPopularityToMenuItems(
    items: any[],
    restaurantId: string,
  ): Promise<any[]> {
    // Calculate popularity using database function
    const { data, error } = await (this.supabase as any).rpc(
      'calculate_menu_item_popularity',
      {
        restaurant_id_param: restaurantId,
        days_back: 30,
      },
    );

    if (error) throw mapSqlError(error);

    // Convert array result to map
    const popularityMap: Record<string, number> = {};
    (data as any)?.forEach((item: any) => {
      popularityMap[item.menu_item_id] = Number(item.popularity_score);
    });

    // Add popularity scores to items
    return items.map((item) => ({
      ...item,
      popularity: popularityMap[item.id] || 0,
    }));
  }

  // Menu Items methods
  async createMenuItem(restaurantId: string, itemData: any) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .insert({
        ...itemData,
        restaurant_id: restaurantId,
      })
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async checkMenuItemExists(
    id: string,
    restaurantId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    return !error && !!data;
  }

  async findMenuItemById(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select(
        `
        *,
        menu_categories(name),
        menu_item_photos(*),
        menu_item_modifier_groups(
          modifier_groups(
            *,
            modifier_options(*)
          )
        )
      `,
      )
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async updateMenuItem(id: string, restaurantId: string, updateData: any) {
    console.log('🔍 Debug - updateMenuItem called', {
      id,
      restaurantId,
      updateData,
    });

    const { data, error } = await this.supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select(
        `
        id,
        restaurant_id,
        category_id,
        name,
        description,
        price,
        prep_time_minutes,
        status,
        is_chef_recommended,
        created_at,
        updated_at
      `,
      )
      .single();

    console.log('🔍 Debug - updateMenuItem result', { data, error });

    if (error) throw mapSqlError(error);
    return data;
  }

  async softDeleteMenuItem(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .update({
        status: 'unavailable',
      })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  // Menu Item Photos methods
  async createMenuItemPhoto(menuItemId: string, photoData: any) {
    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .insert({
        menu_item_id: menuItemId,
        url: photoData.url,
        storage_key: photoData.storage_key,
        is_primary: photoData.is_primary || false,
      })
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async findMenuItemPhotos(menuItemId: string) {
    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .order('created_at', { ascending: false });

    if (error) throw mapSqlError(error);
    return data;
  }

  async deleteMenuItemPhoto(photoId: string, menuItemId: string) {
    // Check if the photo being deleted is primary
    const { data: photoToDelete, error: fetchError } = await this.supabase
      .from('menu_item_photos')
      .select('is_primary')
      .eq('id', photoId)
      .eq('menu_item_id', menuItemId)
      .single();

    if (fetchError) throw mapSqlError(fetchError);

    const isPrimary = photoToDelete?.is_primary;

    // If deleting primary photo, set another as primary (newest based on created_at)
    if (isPrimary) {
      const { data: otherPhotos, error: otherPhotosError } = await this.supabase
        .from('menu_item_photos')
        .select('id')
        .eq('menu_item_id', menuItemId)
        .neq('id', photoId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (otherPhotosError) throw mapSqlError(otherPhotosError);

      if (otherPhotos && otherPhotos.length > 0) {
        // Set the newest other photo as primary
        await this.supabase
          .from('menu_item_photos')
          .update({ is_primary: true })
          .eq('id', otherPhotos[0].id);
      }
    }

    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .delete()
      .eq('id', photoId)
      .eq('menu_item_id', menuItemId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async setPrimaryPhoto(photoId: string, menuItemId: string) {
    // First, unset all primary photos for this item
    await this.supabase
      .from('menu_item_photos')
      .update({ is_primary: false })
      .eq('menu_item_id', menuItemId);

    // Then set the specified photo as primary
    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .update({ is_primary: true })
      .eq('id', photoId)
      .eq('menu_item_id', menuItemId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  // Modifier Groups methods
  async attachModifierGroupsToItem(menuItemId: string, groupIds: string[]) {
    // First, remove existing associations
    await this.supabase
      .from('menu_item_modifier_groups')
      .delete()
      .eq('menu_item_id', menuItemId);

    // Then add new associations
    if (groupIds.length > 0) {
      const associations = groupIds.map((groupId) => ({
        menu_item_id: menuItemId,
        group_id: groupId,
      }));

      const { data, error } = await this.supabase
        .from('menu_item_modifier_groups')
        .insert(associations)
        .select();

      if (error) throw mapSqlError(error);
      return data;
    }

    return [];
  }

  // Guest Menu methods
  async getGuestMenu(restaurantId: string, filter: MenuItemFilter = {}) {
    const {
      search,
      categoryId,
      chefRecommended,
      sortBy,
      sortOrder,
      page = 1,
      limit = 20,
    } = filter;

    // Build base query
    let query = this.supabase
      .from('menu_items')
      .select(
        `
        *,
        menu_categories!inner(*),
        menu_item_photos!left(*),
        menu_item_modifier_groups(
          modifier_groups(
            *,
            modifier_options(*)
          )
        )
      `,
      )
      .eq('menu_categories.restaurant_id', restaurantId)
      .eq('menu_categories.status', MENU_CATEGORY_STATUS_ACTIVE)
      .in('status', [MENU_ITEM_STATUS_AVAILABLE, MENU_ITEM_STATUS_SOLD_OUT]);

    // Apply filters
    query = this.applyMenuItemFilters(
      query,
      { search, categoryId, chefRecommended },
      true,
    );

    // Get all matching items
    const { data: allItems, error } = await query;
    if (error) throw mapSqlError(error);

    // Filter out inactive modifier groups and options
    const filteredItems = (allItems || []).map((item) => ({
      ...item,
      menu_item_modifier_groups:
        item.menu_item_modifier_groups
          ?.filter(
            (junction: any) =>
              junction.modifier_groups?.status ===
              MENU_MODIFIER_GROUPS_STATUS_ACTIVE,
          )
          .map((junction: any) => ({
            ...junction,
            modifier_groups: {
              ...junction.modifier_groups,
              modifier_options:
                junction.modifier_groups?.modifier_options?.filter(
                  (option: any) =>
                    option.status === MENU_MODIFIER_OPTIONS_STATUS_ACTIVE,
                ) || [],
            },
          })) || [],
    }));

    // Add popularity and sort
    const itemsWithPopularity = await this.addPopularityToMenuItems(
      filteredItems,
      restaurantId,
    );
    const sortedItems = this.sortMenuItems(
      itemsWithPopularity,
      sortBy,
      sortOrder,
    );

    // Paginate items
    const pagination = this.paginateItems(sortedItems, page, limit);

    // Add category name to each item and flatten the structure
    const itemsWithCategoryName = pagination.items.map((item) => ({
      ...item,
      categoryName: item.menu_categories?.name || null,
      menu_categories: undefined, // Remove the nested menu_categories object
    }));

    return {
      items: itemsWithCategoryName,
      pagination: {
        total: pagination.total,
        totalPages: pagination.totalPages,
        page: pagination.page,
        limit: pagination.limit,
      },
    };
  }

  // --- Admin Items List ---
  async getAdminMenuItems(restaurantId: string, filters: MenuItemQueryDto) {
    // Build base query
    let query = this.supabase
      .from('menu_items')
      .select(
        `
        *,
        category:menu_categories(name),
        menu_item_photos(id, menu_item_id, url, is_primary, created_at),
        menu_item_modifier_groups(
          modifier_groups(
            id,
            name,
            selection_type,
            is_required,
            min_selections,
            max_selections,
            display_order,
            status,
            created_at,
            updated_at,
            modifier_options(
              id,
              name,
              price_adjustment,
              status,
              created_at
            )
          )
        )
      `,
        { count: 'exact' },
      )
      .eq('restaurant_id', restaurantId);

    // Apply filters
    query = this.applyMenuItemFilters(query, {
      search: filters.search,
      categoryId: filters.categoryId,
      status: filters.status,
    });

    // Get all matching items
    const { data: allItems, error, count } = await query;
    if (error) throw mapSqlError(error);

    // Add popularity and sort
    const itemsWithPopularity = await this.addPopularityToMenuItems(
      allItems || [],
      restaurantId,
    );
    const sortedItems = this.sortMenuItems(
      itemsWithPopularity,
      filters.sortBy,
      filters.sortOrder,
    );

    // Paginate and transform
    const pagination = this.paginateItems(
      sortedItems,
      filters.page,
      filters.limit,
    );

    // Transform data to flatten modifier groups structure and rename category
    const transformedData = pagination.items.map((item) => ({
      ...item,
      categoryName: item.category?.name,
      category: undefined, // Remove the nested category object
      menu_item_modifier_groups:
        item.menu_item_modifier_groups
          ?.map((junction: any) => junction.modifier_groups)
          .filter(Boolean) || [],
    }));

    return {
      data: transformedData,
      count,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
