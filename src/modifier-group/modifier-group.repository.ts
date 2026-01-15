import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import {
  Database,
  TablesInsert,
  TablesUpdate,
} from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class ModifierGroupRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

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
      .order('display_order', { ascending: true });

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

  async softDeleteModifierGroup(id: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('modifier_groups')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }
}
