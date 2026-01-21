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
      .order('created_at', { ascending: true });

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
      .eq('assigned_waiter_id', waiterId)
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
      status?: 'pending' | 'accepted' | 'ready' | 'served' | 'payment_pending';
      tableId?: string;
      waiterId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // If filtering by waiterId, first get assigned table IDs
    let assignedTableIds: string[] | undefined;
    if (filters.waiterId) {
      const { data: tables, error: tablesError } = await this.supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('assigned_waiter_id', filters.waiterId);

      if (tablesError) throw mapSqlError(tablesError);

      assignedTableIds = tables?.map((t) => t.id) || [];

      // If waiter has no assigned tables, return empty result
      if (assignedTableIds.length === 0) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    // Build status filter for order_items or orders
    let orderItemStatusFilter: string | undefined;
    let isOrderStatusFilter = false;

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
        case 'payment_pending':
          // payment_pending is an order status, not order_item status
          isOrderStatusFilter = true;
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
          restaurant_id,
          assigned_waiter_id
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

    // Filter by assigned table IDs if waiterId was provided
    if (assignedTableIds) {
      query = query.in('table_id', assignedTableIds);
    }

    // Filter by order status if payment_pending
    if (isOrderStatusFilter && filters.status === 'payment_pending') {
      query = query.eq('status', 'payment_pending');
    }

    // Filter by restaurant through table relationship
    // query = query.eq('table.restaurant_id', restaurantId);

    // Filter order_items by status if specified (not for payment_pending)
    if (orderItemStatusFilter && !isOrderStatusFilter) {
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
    // For payment_pending, return all order items without filtering
    let filteredData = data || [];
    if (filters.status && filteredData.length > 0 && !isOrderStatusFilter) {
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

  /**
   * Recalculate and update order total amount
   */
  async recalculateOrderTotal(orderId: string) {
    // Get all order items for this order
    const { data: orderItems, error: itemsError } = await this.supabase
      .from('order_items')
      .select(
        `
        *,
        order_item_options:order_item_options(
          price_at_time
        )
      `,
      )
      .eq('order_id', orderId)
      .neq('status', 'rejected'); // Exclude rejected items

    if (itemsError) throw mapSqlError(itemsError);

    // Calculate total amount
    const totalAmount = orderItems.reduce((sum, item) => {
      // Base item price
      const itemTotal = item.quantity * item.unit_price;

      // Add modifier prices
      const modifierTotal =
        item.order_item_options?.reduce(
          (modSum, opt) => modSum + (opt.price_at_time || 0),
          0,
        ) || 0;

      return sum + itemTotal + modifierTotal * item.quantity;
    }, 0);

    // Update order total
    const { data, error } = await this.supabase
      .from('orders')
      .update({
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }
}
