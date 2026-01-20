import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';

@Injectable()
export class StaffManagementRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Get all staff members for a restaurant with optional filters
   */
  async findStaffByRestaurant(
    restaurantId: string,
    filters: ListStaffQueryDto = {},
  ) {
    const { role, isActive, page = 1, limit = 10 } = filters;

    // Build query
    let query = this.supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .in('role', ['admin', 'waiter', 'kitchen_staff']);

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw mapSqlError(error);
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Find a staff member by ID
   */
  async findStaffById(staffId: string, restaurantId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .in('role', ['admin', 'waiter', 'kitchen_staff'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Staff member not found');
      }
      throw mapSqlError(error);
    }

    return data;
  }

  /**
   * Update staff member profile
   */
  async updateStaff(
    staffId: string,
    restaurantId: string,
    updateData: {
      fullName?: string;
      phoneNumber?: string;
      avatarUrl?: string;
      isActive?: boolean;
    },
  ) {
    // First check if staff exists and belongs to restaurant
    await this.findStaffById(staffId, restaurantId);

    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      throw mapSqlError(error);
    }

    return data;
  }

  /**
   * Get profile by auth user ID (used after signup to get complete profile)
   */
  async findProfileByAuthId(authId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', authId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Profile not found');
      }
      throw mapSqlError(error);
    }

    return data;
  }

  /**
   * Get user email from auth.users by user ID
   */
  async getUserEmail(userId: string): Promise<string> {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return '';
    }

    return data.user.email || '';
  }

  /**
   * Get multiple user emails from auth.users by user IDs
   */
  async getUserEmails(userIds: string[]): Promise<Map<string, string>> {
    const emailMap = new Map<string, string>();

    // Fetch emails in parallel
    const emailPromises = userIds.map(async (userId) => {
      const email = await this.getUserEmail(userId);
      return { userId, email };
    });

    const results = await Promise.all(emailPromises);

    results.forEach(({ userId, email }) => {
      emailMap.set(userId, email);
    });

    return emailMap;
  }
}
