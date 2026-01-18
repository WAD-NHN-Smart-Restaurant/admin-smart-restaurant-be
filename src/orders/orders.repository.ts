import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { OrderItemDto } from './dto/create-order.dto';
import { mapSqlError } from '../utils/map-sql-error.util';

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  /**
   * Create a new order for a table
   */
  async createOrder(
    tableId: string,
    restaurantId: string,
    guestName?: string,
    notes?: string,
  ) {
    const { data, error } = await this.supabase
      .from('orders')
      .insert({
        table_id: tableId,
        status: 'pending',
        guest_name: guestName,
        notes: notes,
        total_amount: 0, // Will be calculated based on items
      })
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get active order for a table (pending, confirmed, or payment_pending)
   */
  async getActiveOrderByTable(tableId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          *,
          menu_items!inner(name),
          order_item_options (
            *,
            modifier_options!inner(name)
          )
        )
      `,
      )
      .eq('table_id', tableId)
      .in('status', ['pending', 'confirmed', 'preparing', 'payment_pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get order by ID with all items
   */
  async getOrderById(orderId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        order_items (
          *,
          menu_items!inner(name),
          order_item_options (
            *,
            modifier_options!inner(name)
          )
        )
      `,
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Add items to existing order
   */
  async addOrderItems(
    orderId: string,
    items: OrderItemDto[],
    menuItems: Map<string, { price: number }>,
  ) {
    const orderItemsData = items.map((item) => {
      const unitPrice = menuItems.get(item.menuItemId)?.price ?? 0;
      const optionsSum = (item.options || []).reduce(
        (sum, opt) => sum + (opt.priceAtTime || 0),
        0,
      );
      const totalPrice = (unitPrice + optionsSum) * item.quantity;
      return {
        order_id: orderId,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: unitPrice,
        notes: item.specialRequest || null,
        status: 'pending' as Database['public']['Enums']['order_item_status'],
        total_price: totalPrice,
      };
    });

    const { data: createdItems, error } = await this.supabase
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (error) throw mapSqlError(error);

    // Insert order item options if provided
    if (items.some((item) => item.options?.length)) {
      const optionsData: {
        order_item_id: string;
        modifier_option_id: string;
        price_at_time: number;
      }[] = [];
      createdItems.forEach((item, index) => {
        const originalItem = items[index];
        if (originalItem.options?.length) {
          originalItem.options.forEach((option) => {
            optionsData.push({
              order_item_id: item.id,
              modifier_option_id: option.optionId,
              price_at_time: option.priceAtTime,
            });
          });
        }
      });

      if (optionsData.length > 0) {
        const { error: optionsError } = await this.supabase
          .from('order_item_options')
          .insert(optionsData);

        if (optionsError) throw mapSqlError(optionsError);
      }
    }

    return createdItems;
  }

  /**
   * Update order total amount
   */
  async updateOrderTotal(orderId: string, totalAmount: number) {
    const { data, error } = await this.supabase
      .from('orders')
      .update({ total_amount: totalAmount })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get orders for a restaurant (via tables join)
   */
  async getOrdersByRestaurant(restaurantId: string, limit = 50, offset = 0) {
    const { data, error, count } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        tables!inner(restaurant_id),
        order_items (
          *,
          menu_items!inner(name),
          order_item_options (
            *,
            modifier_options!inner(name)
          )
        )
      `,
        { count: 'exact' },
      )
      .eq('tables.restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw mapSqlError(error);
    return { data, count };
  }
}
