import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class KitchenRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Get kitchen orders with filtering
   * Returns orders with items in 'accepted', 'preparing', or 'ready' status
   */
  async getKitchenOrders(
    restaurantId: string,
    filters: {
      status?: 'accepted' | 'preparing' | 'ready' | 'completed';
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    // Build status filter for order_items based on kitchen status
    let orderItemStatusFilter: string | undefined;
    if (filters.status) {
      switch (filters.status) {
        case 'accepted':
          // Received means just sent from waiter (accepted status, ready to start preparing)
          orderItemStatusFilter = 'status.eq.accepted';
          break;
        case 'preparing':
          orderItemStatusFilter = 'status.eq.preparing';
          break;
        case 'ready':
          orderItemStatusFilter = 'status.eq.ready';
          break;
        case 'completed':
          // Completed means all items have been served
          orderItemStatusFilter = 'status.eq.served';
          break;
      }
    } else {
      // Default: show accepted, preparing, and ready items (active kitchen items)
      orderItemStatusFilter =
        'status.eq.accepted,status.eq.preparing,status.eq.ready';
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
            category_id,
            prep_time_minutes,
            menu_category:menu_categories(name)
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
    );

    // Filter by active orders only
    // query = query.eq('status', 'active');

    // Filter order_items by status
    if (orderItemStatusFilter) {
      query = query.or(orderItemStatusFilter, {
        foreignTable: 'order_items',
      });
    }

    if (filters.search) {
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

    const { data, error } = await query.order('created_at', {
      ascending: true,
    });

    if (error) throw mapSqlError(error);

    // Filter order_items client-side to only include items matching the status
    let filteredData = data || [];
    if (filters.status && filteredData.length > 0) {
      filteredData = filteredData
        .map((order) => {
          let filteredItems = order.order_items || [];

          // Filter items based on kitchen status
          switch (filters.status) {
            case 'accepted':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'accepted',
              );
              break;
            case 'preparing':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'preparing',
              );
              break;
            case 'ready':
              filteredItems = filteredItems.filter(
                (item) => item.status === 'ready',
              );
              break;
            case 'completed':
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
        .filter((order) => order.order_items.length > 0);
    } else if (!filters.status) {
      // If no status filter, show accepted, preparing, and ready items
      filteredData = filteredData
        .map((order) => ({
          ...order,
          order_items: (order.order_items || []).filter(
            (item) =>
              item.status === 'accepted' ||
              item.status === 'preparing' ||
              item.status === 'ready',
          ),
        }))
        .filter((order) => order.order_items.length > 0);
    }

    return filteredData;
  }

  /**
   * Update order item status in kitchen
   */
  async updateOrderItemStatus(
    orderItemId: string,
    status: 'preparing' | 'ready' | 'rejected',
    note?: string,
  ) {
    const updateData: {
      status: 'preparing' | 'ready' | 'rejected';
      updated_at: string;
      notes?: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (note) {
      updateData.notes = note;
    }

    const { data, error } = await this.supabase
      .from('order_items')
      .update(updateData)
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
   * Bulk update order items status
   */
  async bulkUpdateOrderItems(
    orderItemIds: string[],
    status: 'preparing' | 'ready',
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
        order:orders!order_items_order_id_fkey(
          *,
          table:tables!orders_table_id_fkey(*)
        )
      `,
      );

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get order item by ID
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
        )
      `,
      )
      .eq('id', orderItemId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }
}
