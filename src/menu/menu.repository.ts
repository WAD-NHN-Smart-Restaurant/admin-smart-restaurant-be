import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import {
  Database,
  TablesInsert,
  TablesUpdate,
} from '../supabase/supabase.types';
import { CategoryQueryDto } from './dto/menu-category.dto';
import { MenuItemQueryDto } from './dto/menu-item.dto';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class MenuRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

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

  async checkMenuItemExists(id: string, restaurantId: string): Promise<boolean> {
    const { data, error } = await this.supabase
    .from('menu_items')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
      .single();

    return !error && !!data;
  }

  async findMenuItemById(id: string, restaurantId: string) {
    console.log('🔍 Debug - findMenuItemById called', { id, restaurantId });
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
    console.log('🔍 Debug - updateMenuItem called', { id, restaurantId, updateData });
    
    const { data, error } = await this.supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select(`
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
      `)
      .single();

    console.log('🔍 Debug - updateMenuItem result', { data, error });

    if (error) throw mapSqlError(error);
    return data;
  }

  async softDeleteMenuItem(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .update({ 
        is_deleted: true,
        status: 'unavailable'
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

  async findModifierGroupsByRestaurant(restaurantId: string) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .select(
        `
        *,
        modifier_options(*)
      `,
      )
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error) throw mapSqlError(error);
    return data;
  }

  // Guest Menu methods
  async getGuestMenu(restaurantId: string, filters: any = {}) {
    // Determine sorting
    // let orderColumn = 'menu_categories.display_order';
    // let orderOptions = { ascending: true };

    // if (filters.sort === 'price_asc') {
    //   orderColumn = 'price';
    //   orderOptions = { ascending: true };
    // } else if (filters.sort === 'price_desc') {
    //   orderColumn = 'price';
    //   orderOptions = { ascending: false };
    // } else if (filters.sort === 'name') {
    //   orderColumn = 'name';
    //   orderOptions = { ascending: true };
    // } else if (filters.sort === 'popularity') {
    //   // Assuming popularity is based on some field, for now use name
    //   orderColumn = 'name';
    //   orderOptions = { ascending: true };
    // }

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
      .eq('menu_categories.status', 'active')
      .eq('is_deleted', false)
      .eq('status', 'available')
      // .order(orderColumn, orderOptions);

    // Apply search filter
    if (filters.q) {
      query = query.ilike('name', `%${filters.q}%`);
    }

    // Apply category filter
    if (filters.categoryId) {
      query = query.eq('menu_categories.id', filters.categoryId);
    }

    // Apply chef recommended filter
    if (filters.chefRecommended === 'true') {
      query = query.eq('is_chef_recommended', true);
    }

    // Apply pagination for menu items
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count separately since complex joins don't return count properly
    let countQuery = this.supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_deleted', false)
      .eq('status', 'active');

    // Apply same filters to count query
    if (filters.q) {
      countQuery = countQuery.ilike('name', `%${filters.q}%`);
    }
    if (filters.categoryId) {
      countQuery = countQuery.eq('category_id', filters.categoryId);
    }
    if (filters.chefRecommended === 'true') {
      countQuery = countQuery.eq('is_chef_recommended', true);
    }

    const { count } = await countQuery;

    // Get the paginated data
    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) throw mapSqlError(error);

    // Group items by category to maintain the original structure
    const grouped: Record<string, any> = data.reduce(
      (acc, item) => {
        const categoryId = item.menu_categories.id;
        if (!acc[categoryId]) {
          acc[categoryId] = {
            ...item.menu_categories,
            menu_items: [],
          };
        }
        // Remove the menu_categories from the item since it's now in the parent
        const { menu_categories, ...itemWithoutCategory } = item;
        acc[categoryId].menu_items.push(itemWithoutCategory);
        return acc;
      },
      {} as Record<string, any>,
    );

    const categories = Object.values(grouped);

    return {
      items: categories,
      pagination: {
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page,
        limit,
      },
    };
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

  async validateModifierGroupBelongsToRestaurant(
    groupId: string,
    restaurantId: string,
  ) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', groupId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) {
      throw new Error(
        'Modifier group not found or does not belong to this restaurant',
      );
    }
    return true;
  }

  // ==========================================
  // DEV B IMPLEMENTATION (Type-Safe Version)
  // ==========================================

  // --- Categories Methods ---
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
        const comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
    // Soft delete: set status = 'inactive'
    const { data, error } = await this.supabase
      .from('menu_categories')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  // --- Admin Items List ---
  async getAdminMenuItems(restaurantId: string, filters: MenuItemQueryDto) {
    // Select thêm tên category, photos và modifier groups để hiển thị
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
      .eq('restaurant_id', restaurantId)

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Sorting logic
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const ascending = sortOrder === 'asc';

    if (sortBy === 'name') {
      query = query.order('name', { ascending });
    } else if (sortBy === 'price') {
      query = query.order('price', { ascending });
    } else if (sortBy === 'createdAt') {
      query = query.order('created_at', { ascending });
    } else if (sortBy === 'popularity') {
      // Assuming popularity is tracked in a field, for now sort by created_at as fallback
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Supabase trả về count để làm phân trang
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false }); // secondary sort

    if (error) throw mapSqlError(error);

    // Transform data to flatten modifier groups structure and rename category
    const transformedData = data?.map(item => ({
      ...item,
      menuCategories: item.category, // Rename category to menuCategories
      menu_item_modifier_groups: item.menu_item_modifier_groups?.map(
        (junction: any) => junction.modifier_groups
      ).filter(Boolean) || []
    })) || [];

    return { data: transformedData, count, page, limit };
  }

  // --- Modifier Groups & Options ---
  async createModifierGroup(
    restaurantId: string,
    payload: Omit<TablesInsert<'modifier_groups'>, 'restaurant_id'>,
  ) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .insert({
        ...payload,
        restaurant_id: restaurantId,
      })
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }

  async updateModifierGroup(
    id: string,
    restaurantId: string,
    payload: TablesUpdate<'modifier_groups'>,
  ) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .update(payload)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }

  async findModifierGroupById(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }

  // Modifier Options thuộc bảng 'modifier_options', có group_id
  async createModifierOption(
    groupId: string,
    payload: Omit<TablesInsert<'modifier_options'>, 'group_id'>,
  ) {
    const { data, error } = await this.supabase
      .from('modifier_options')
      .insert({
        ...payload,
        group_id: groupId,
      })
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }

  async updateModifierOption(
    id: string,
    payload: TablesUpdate<'modifier_options'>,
  ) {
    const { data, error } = await this.supabase
      .from('modifier_options')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }

  // Validate Option thuộc về Restaurant thông qua Group
  async validateOptionBelongsToRestaurant(
    optionId: string,
    restaurantId: string,
  ) {
    // !inner join để lọc chính xác các record khớp điều kiện
    const { data, error } = await this.supabase
      .from('modifier_options')
      .select(
        `
        group_id,
        modifier_groups!inner(restaurant_id)
      `,
      )
      .eq('id', optionId)
      .eq('modifier_groups.restaurant_id', restaurantId)
      .single();

    if (error || !data) return false;
    return true;
  }
}
