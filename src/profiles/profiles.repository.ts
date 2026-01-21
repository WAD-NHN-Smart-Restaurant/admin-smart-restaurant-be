import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class ProfilesRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  async findProfileById(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Profile not found');
      }
      throw mapSqlError(error);
    }

    return data;
  }

  async updateProfile(
    userId: string,
    updateData: {
      full_name?: string;
      phone_number?: string | null;
      avatar_url?: string | null;
      storage_key?: string | null;
    },
  ) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw mapSqlError(error);

    return data;
  }

  async getAvatarStorageKey(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('storage_key')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw mapSqlError(error);
    }

    return data.storage_key;
  }

  async getUsersByRole(restaurantId: string, role: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, phone_number, avatar_url, role')
      .eq('restaurant_id', restaurantId)
      .eq('role', role as Database['public']['Enums']['user_role'])
      .order('full_name', { ascending: true });

    if (error) throw mapSqlError(error);

    return data;
  }

  async createProfile(profileData: {
    id: string;
    full_name?: string;
    role?: Database['public']['Enums']['user_role'];
    restaurant_id?: string | null;
    avatar_url?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert({
        id: profileData.id,
        full_name: profileData.full_name || null,
        role: profileData.role || 'customer',
        restaurant_id: profileData.restaurant_id || null,
        avatar_url: profileData.avatar_url || null,
      })
      .select()
      .single();

    if (error) throw mapSqlError(error);

    return data;
  }

  async profileExists(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapSqlError(error);
    }

    return !!data;
  }
}
