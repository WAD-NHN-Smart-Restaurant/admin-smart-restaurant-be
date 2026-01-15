import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

export interface CreateBillData {
  orderId: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  discountReason?: string;
}

export interface UpdatePaymentData {
  paymentMethod: Database['public']['Enums']['payment_method'];
  amount: number;
}

@Injectable()
export class BillsRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Get order with all items for bill calculation
   */
  async getOrderForBill(orderId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        table:tables!orders_table_id_fkey(
          id,
          table_number,
          location
        ),
        order_items:order_items(
          *,
          menu_item:menu_items(
            id,
            name,
            price
          ),
          order_item_options:order_item_options(
            *,
            modifier_option:modifier_options(
              id,
              name,
              price_adjustment
            )
          )
        ),
        payments:payments(*)
      `,
      )
      .eq('id', orderId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update order with bill totals
   */
  async updateOrderTotals(orderId: string, totalAmount: number) {
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

  /**
   * Create payment record
   */
  async createPayment(orderId: string, paymentData: UpdatePaymentData) {
    const { data, error } = await this.supabase
      .from('payments')
      .insert({
        order_id: orderId,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        status: 'success',
      })
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
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get bills for a restaurant
   */
  async getBillsByRestaurant(
    restaurantId: string,
    filters: {
      status?: string;
      paymentMethod?: string;
      tableNumber?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      status,
      paymentMethod,
      tableNumber,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // Build base query
    let query = this.supabase
      .from('orders')
      .select(
        `
        *,
        table:tables!orders_table_id_fkey(
          id,
          table_number,
          restaurant_id
        ),
        payments:payments(*),
        order_items:order_items(
          id,
          quantity,
          unit_price,
          total_price
        )
      `,
        { count: 'exact' },
      )
      .eq('table.restaurant_id', restaurantId)
      .in('status', ['payment_pending', 'completed', 'cancelled']);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (tableNumber) {
      query = query.eq('table.table_number', tableNumber);
    }

    if (paymentMethod) {
      query = query.eq('payments.payment_method', paymentMethod);
    }

    // Apply sorting
    if (sortBy === 'table_number') {
      query = query.order('table_number', {
        ascending: sortOrder === 'asc',
        foreignTable: 'table',
      });
    } else if (sortBy === 'total_amount') {
      query = query.order('total_amount', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw mapSqlError(error);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: data || [],
      pagination: {
        total,
        totalPages,
        page,
        limit,
      },
    };
  }

  /**
   * Get bill by order ID
   */
  async getBillByOrderId(orderId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        table:tables!orders_table_id_fkey(*),
        payments:payments(*),
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
      .eq('id', orderId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }
}
