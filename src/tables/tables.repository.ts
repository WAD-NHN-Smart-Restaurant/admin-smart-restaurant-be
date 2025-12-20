import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';

type TableRow = Database['public']['Tables']['tables']['Row'];
type TableInsert = Database['public']['Tables']['tables']['Insert'];
type TableUpdate = Database['public']['Tables']['tables']['Update'];

@Injectable()
export class TablesRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  async create(tableData: TableInsert): Promise<TableRow> {
    const { data, error } = await this.supabase
      .from('tables')
      .insert(tableData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async findByTableNumber(tableNumber: string): Promise<TableRow | null> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Find a table by table_number excluding a specific id
   * Used for checking uniqueness during updates
   */
  async findByTableNumberExcludingId(
    tableNumber: string,
    excludeId: string,
  ): Promise<TableRow | null> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('table_number', tableNumber)
      .neq('id', excludeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findById(id: string): Promise<TableRow | null> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  async findAll(filters: {
    status?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<TableRow[]> {
    let query = this.supabase.from('tables').select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq(
        'status',
        filters.status as Database['public']['Enums']['table_status'],
      );
    }

    if (filters.location) {
      query = query.eq('location', filters.location);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async update(id: string, updateData: TableUpdate): Promise<TableRow> {
    const { data, error } = await this.supabase
      .from('tables')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Update only the status field
   */
  async updateStatus(
    id: string,
    status: Database['public']['Enums']['table_status'],
  ): Promise<TableRow> {
    const { data, error } = await this.supabase
      .from('tables')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Count active orders for a table
   */
  async countActiveOrders(tableId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', tableId)
      .in('status', ['active', 'payment_pending']);

    if (error) {
      throw error;
    }

    return count || 0;
  }

  async getUniqueLocations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('location')
      .not('location', 'is', null);

    if (error) {
      throw error;
    }

    // Extract unique locations
    const locations = [...new Set(data.map((t) => t.location).filter(Boolean))];
    return locations as string[];
  }

  /**
   * Update QR token for a table
   */
  async updateQRToken(
    id: string,
    qrToken: string,
    qrTokenCreatedAt: string,
  ): Promise<TableRow> {
    const { data, error } = await this.supabase
      .from('tables')
      .update({
        qr_token: qrToken,
        qr_token_created_at: qrTokenCreatedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
