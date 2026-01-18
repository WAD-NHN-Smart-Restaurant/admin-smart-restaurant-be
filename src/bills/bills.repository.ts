import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

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
          location,
          restaurant_id
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
        )
      `,
      )
      .eq('id', orderId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get order with table relationship for restaurant ID
   */
  async getOrderWithTable(orderId: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        `
        *,
        tables:tables!orders_table_id_fkey(
          restaurant_id
        )
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
        status: 'pending',
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
      waiterId?: string;
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
      waiterId,
      status,
      paymentMethod,
      tableNumber,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // If waiterId is provided, get assigned table IDs first
    let assignedTableIds: string[] | undefined;
    if (waiterId) {
      const { data: assignedTables } = await this.supabase
        .from('tables')
        .select('id')
        .eq('assigned_waiter_id', waiterId)
        .eq('restaurant_id', restaurantId);

      if (!assignedTables || assignedTables.length === 0) {
        // No assigned tables, return empty result
        return {
          items: [],
          pagination: {
            total: 0,
            totalPages: 0,
            page,
            limit,
          },
        };
      }

      assignedTableIds = assignedTables.map((t) => t.id);
    }

    let query = this.supabase
      .from('payments')
      .select(
        `
        *,
        order:orders!payments_order_id_fkey(
          id,
          status,
          total_amount,
          created_at,
          table:tables!orders_table_id_fkey(
            id,
            table_number,
            location,
            restaurant_id
          ),
          order_items:order_items(id)
        )
      `,
        { count: 'exact' },
      )
      .eq('order.table.restaurant_id', restaurantId);

    // Apply waiter filter if assigned tables exist
    if (assignedTableIds && assignedTableIds.length > 0) {
      query = query.in('order.table_id', assignedTableIds);
    }

    // Apply status filter
    if (status) {
      query = query.eq(
        'status',
        status as Database['public']['Enums']['payment_status'],
      );
    }

    // Apply table number filter
    if (tableNumber) {
      query = query.eq('order.table.table_number', tableNumber);
    }

    // Apply payment method filter
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    // Apply sorting
    const dbSortBy = sortBy === 'createdAt' ? 'created_at' : sortBy;
    query = query.order(dbSortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const offset = (page - 1) * limit;
    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw mapSqlError(error);

    return {
      items: data || [],
      pagination: {
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page,
        limit,
      },
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string) {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string) {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update payment amount and metadata
   */
  async updatePaymentAmountAndMetadata(
    paymentId: string,
    amount: number,
    metadata: any,
  ) {
    const { data, error } = await this.supabase
      .from('payments')
      .update({
        amount,
        metadata:
          metadata as Database['public']['Tables']['payments']['Insert']['metadata'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
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
        table:tables!orders_table_id_fkey(
          id,
          table_number,
          location,
          restaurant_id
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
        payments:payments(
          *
        )
      `,
      )
      .eq('id', orderId)
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }
}
