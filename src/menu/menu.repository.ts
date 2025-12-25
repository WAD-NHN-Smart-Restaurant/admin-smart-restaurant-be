import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';

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

    if (error) throw error;
    return data;
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
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  }

  async updateMenuItem(id: string, restaurantId: string, updateData: any) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async softDeleteMenuItem(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('menu_items')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Menu Item Photos methods
  async createMenuItemPhoto(menuItemId: string, photoData: any) {
    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .insert({
        menu_item_id: menuItemId,
        ...photoData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findMenuItemPhotos(menuItemId: string) {
    const { data, error } = await this.supabase
      .from('menu_item_photos')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
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

    if (error) throw error;
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

    if (error) throw error;
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

      if (error) throw error;
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

    if (error) throw error;
    return data;
  }

  // Guest Menu methods
  async getGuestMenu(restaurantId: string, filters: any = {}) {
    let query = this.supabase
      .from('menu_categories')
      .select(
        `
        *,
        menu_items!inner(
          *,
          menu_item_photos!left(*),
          menu_item_modifier_groups(
            modifier_groups(
              *,
              modifier_options(*)
            )
          )
        )
      `,
      )
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .eq('menu_items.is_deleted', false)
      .eq('menu_items.status', 'available')
      .order('display_order', { ascending: true });

    // Apply search filter
    if (filters.q) {
      query = query.ilike('menu_items.name', `%${filters.q}%`);
    }

    // Apply category filter
    if (filters.categoryId) {
      query = query.eq('id', filters.categoryId);
    }

    // Apply chef recommended filter
    if (filters.chefRecommended === 'true') {
      query = query.eq('menu_items.is_chef_recommended', true);
    }

    // Apply sorting
    if (filters.sort === 'price_asc') {
      query = query.order('menu_items.price', { ascending: true });
    } else if (filters.sort === 'price_desc') {
      query = query.order('menu_items.price', { ascending: false });
    } else if (filters.sort === 'name') {
      query = query.order('menu_items.name', { ascending: true });
    }

    // Apply pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
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
}
