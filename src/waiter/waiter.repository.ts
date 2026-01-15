import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class WaiterRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Get orders by table ID
   */
  async getOrdersByTable(tableId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        table:tables!orders_table_id_fkey(*),
        order_items:order_items(
          *,
          menu_item:menu_items(*),
          order_item_options:order_item_options(
            *,
            modifier_option:modifier_options(*)
          )
        )
      `,
      )
      .eq('table_id', tableId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update order item status
   */
  async updateOrderItemStatus(
    orderItemId: string,
    status: Database['public']['Enums']['order_item_status'],
  ) {
    const { data, error } = await this.supabase
      .from('order_items')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderItemId)
      .select(
        `
        *,
        menu_item:menu_items(*),
        order:orders!order_items_order_id_fkey(
          *,
          table:tables!orders_table_id_fkey(*)
        )
      `,
      )
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update multiple order items status
   */
  async updateMultipleOrderItemsStatus(
    orderItemIds: string[],
    status: Database['public']['Enums']['order_item_status'],
  ) {
    const { data, error } = await this.supabase
      .from('order_items')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .in('id', orderItemIds)
      .select(
        `
        *,
        menu_item:menu_items(*),
        order:orders!order_items_order_id_fkey(*)
      `,
      );

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get assigned tables for a waiter
   */
  async getAssignedTables(waiterId: string, restaurantId: string) {
    // For now, we'll return all tables for the restaurant
    // In future, you can add a table_assignments table
    const { data, error } = await this.supabase
      .from('tables')
      .select(
        `
        *,
        orders:orders(
          id,
          status,
          created_at,
          total_amount
        )
      `,
      )
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true });

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get order item by ID with full details
   */
  async getOrderItemById(orderItemId: string) {
    const { data, error } = await this.supabase
      .from('order_items')
      .select(
        `
        *,
        menu_item:menu_items(*),
        order:orders!order_items_order_id_fkey(
          *,
          table:tables!orders_table_id_fkey(*)
        ),
        order_item_options:order_item_options(
          *,
          modifier_option:modifier_options(*)
        )
      `,
      )
      .eq('id', orderItemId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get waiter orders with filtering
   */
  async getWaiterOrders(
    restaurantId: string,
    filters: {
      search?: string;
      status?: 'pending' | 'accepted' | 'ready' | 'served';
      tableId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    console.log(
      'Fetching waiter orders with filters:',
      filters,
      'for restaurant:',
      restaurantId,
    );
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Build status filter for order_items
    let orderItemStatusFilter: string | undefined;
    if (filters.status) {
      switch (filters.status) {
        case 'pending':
          orderItemStatusFilter = 'status.eq.pending';
          break;
        case 'accepted':
          orderItemStatusFilter = 'status.eq.accepted,status.eq.preparing';
          break;
        case 'ready':
          orderItemStatusFilter = 'status.eq.ready';
          break;
        case 'served':
          orderItemStatusFilter = 'status.eq.served';
          break;
      }
    }

    let query = this.supabase.from('orders').select(
      `
        *,
        table:tables!orders_table_id_fkey(
          id,
          table_number,
          location,
          capacity,
          restaurant_id
        ),
        order_items:order_items(
          *,
          menu_item:menu_items(
            id,
            name,
            description,
            price,
            prep_time_minutes
          ),
          order_item_options:order_item_options(
            *,
            modifier_option:modifier_options(
              id,
              name,
              price_adjustment
            )
          )
        )
      `,
      { count: 'exact' },
    );

    // Filter by restaurant through table relationship
    // query = query.eq('table.restaurant_id', restaurantId);

    // Filter order_items by status if specified
    if (orderItemStatusFilter) {
      query = query.or(orderItemStatusFilter, {
        foreignTable: 'order_items',
      });
    }

    if (filters.tableId) {
      query = query.eq('table_id', filters.tableId);
    }

    if (filters.search) {
      // Search by table number
      query = query.or(
        `table.table_number.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`,
      );
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw mapSqlError(error);

    // Filter order_items client-side to only include items matching the status
    let filteredData = data || [];
    if (filters.status && filteredData.length > 0) {
      filteredData = filteredData
        .map((order) => {
          let filteredItems = order.order_items || [];

          // Filter items based on status
          switch (filters.status) {
            case 'pending':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'pending',
              );
              break;
            case 'accepted':
              filteredItems = filteredItems.filter(
                (item) =>
                  item.status === 'accepted' || item.status === 'preparing',
              );
              break;
            case 'ready':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'ready',
              );
              break;
            case 'served':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'served',
              );
              break;
          }

          return {
            ...order,
            order_items: filteredItems,
          };
        })
        .filter((order) => order.order_items.length > 0); // Only return orders with matching items
    }

    return {
      items: filteredData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }
}
