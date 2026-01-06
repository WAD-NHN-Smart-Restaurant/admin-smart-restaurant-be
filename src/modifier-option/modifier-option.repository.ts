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
export class ModifierOptionRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  // Modifier Options methods
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

  // Validate Option belongs to Restaurant through Group
  async validateOptionBelongsToRestaurant(
    optionId: string,
    restaurantId: string,
  ) {
    // !inner join to filter exact matching records
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

  async softDeleteModifierOption(optionId: string, restaurantId: string) {
    // First validate the option belongs to the restaurant
    const isValid = await this.validateOptionBelongsToRestaurant(
      optionId,
      restaurantId,
    );
    if (!isValid) {
      throw new Error('Modifier option not found or access denied');
    }

    const { data, error } = await this.supabase
      .from('modifier_options')
      .update({ status: 'inactive' })
      .eq('id', optionId)
      .select()
      .single();
    if (error) throw mapSqlError(error);
    return data;
  }
}
