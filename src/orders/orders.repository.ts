import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { OrderItemDto } from './dto/create-order.dto';
import { mapSqlError } from '../utils/map-sql-error.util';

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
// type OrderItemOption =
//   Database['public']['Tables']['order_item_options']['Row'];

interface OrderItemOptionPartial {
  modifier_option_id: string | null;
  price_at_time: number | null;
}

interface OrderItemWithOptions extends OrderItem {
  order_item_options: OrderItemOptionPartial[];
}

interface OrderItemToInsert extends Omit<OrderItemInsert, 'id' | 'created_at'> {
  originalItem: OrderItemDto;
}

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
        status: 'active',
        guest_name: guestName,
        special_request: notes,
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
          item_name:menu_items(name),
          order_item_options (
            *,
            modifier_options!inner(name),
            option_name:modifier_options(name)
          )
        )
      `,
      )
      .eq('table_id', tableId)
      .in('status', ['active', 'payment_pending'])
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
   * Get order by ID with table relationship (includes restaurant_id)
   */
  async getOrderWithTable(orderId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        tables!inner(restaurant_id),
        order_items (
          *,
          order_item_options (*)
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
   * If an item with the same menu_item_id AND same options already exists with 'pending' status,
   * update its quantity instead of creating a new row
   */
  async addOrderItems(
    orderId: string,
    items: OrderItemDto[],
    menuItems: Map<string, { price: number }>,
  ) {
    // Fetch existing pending order items with their options for this order
    const { data: existingItems, error: fetchError } = await this.supabase
      .from('order_items')
      .select(
        `
        *,
        order_item_options (
          modifier_option_id,
          price_at_time
        )
      `,
      )
      .eq('order_id', orderId)
      .eq('status', 'pending');

    if (fetchError) throw mapSqlError(fetchError);

    const itemsToInsert: OrderItemToInsert[] = [];
    const itemsToUpdate: Array<{
      id: string;
      quantity: number;
      total_price: number;
    }> = [];
    const updatedItems: OrderItemWithOptions[] = [];

    // Helper function to compare options
    const haveSameOptions = (
      existingOptions: OrderItemOptionPartial[],
      newOptions: { optionId: string; priceAtTime: number }[] = [],
    ) => {
      if (existingOptions.length !== newOptions.length) return false;

      const existingIds = existingOptions
        .map((o) => o.modifier_option_id)
        .sort();
      const newIds = newOptions.map((o) => o.optionId).sort();

      return (
        existingIds.length === newIds.length &&
        existingIds.every((id, index) => id === newIds[index])
      );
    };

    // Process each item
    for (const item of items) {
      const unitPrice = menuItems.get(item.menuItemId)?.price ?? 0;
      const optionsSum = (item.options || []).reduce(
        (sum, opt) => sum + (opt.priceAtTime || 0),
        0,
      );

      // Find existing item with same menu_item_id AND same options
      const existingItem = (existingItems || []).find(
        (existing) =>
          existing.menu_item_id === item.menuItemId &&
          haveSameOptions(existing.order_item_options || [], item.options),
      );

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + item.quantity;
        const newTotalPrice = (unitPrice + optionsSum) * newQuantity;

        itemsToUpdate.push({
          id: existingItem.id,
          quantity: newQuantity,
          total_price: newTotalPrice,
        });

        updatedItems.push({
          ...existingItem,
          quantity: newQuantity,
          total_price: newTotalPrice,
        });
      } else {
        // Insert new item (different menu_item or different options)
        const totalPrice = (unitPrice + optionsSum) * item.quantity;
        itemsToInsert.push({
          order_id: orderId,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          unit_price: unitPrice,
          notes: item.specialRequest || null,
          status: 'pending' as Database['public']['Enums']['order_item_status'],
          total_price: totalPrice,
          originalItem: item, // Keep reference for options
        });
      }
    }

    // Update existing items
    for (const updateData of itemsToUpdate) {
      const { error: updateError } = await this.supabase
        .from('order_items')
        .update({
          quantity: updateData.quantity,
          total_price: updateData.total_price,
        })
        .eq('id', updateData.id);

      if (updateError) throw mapSqlError(updateError);
    }

    // Insert new items
    let createdItems: OrderItem[] = [];
    if (itemsToInsert.length > 0) {
      const insertData = itemsToInsert.map(({ originalItem, ...item }) => item);
      const { data, error } = await this.supabase
        .from('order_items')
        .insert(insertData)
        .select();

      if (error) throw mapSqlError(error);
      createdItems = data || [];

      // Insert order item options for new items
      const optionsData: {
        order_item_id: string;
        modifier_option_id: string;
        price_at_time: number;
      }[] = [];

      createdItems.forEach((item, index) => {
        const originalItem = itemsToInsert[index].originalItem;
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

    // Return both updated and created items
    return [...updatedItems, ...createdItems];
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
  async updateOrderStatus(
    orderId: string,
    status: Database['public']['Enums']['order_status'],
  ) {
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
