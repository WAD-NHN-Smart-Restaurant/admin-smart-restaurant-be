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
      phone_number?: string;
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
}
