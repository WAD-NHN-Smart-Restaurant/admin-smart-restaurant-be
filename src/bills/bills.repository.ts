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

// Mock data for bills/orders
const MOCK_BILLS: any[] = [
  {
    id: '650e8400-e29b-41d4-a716-446655440003',
    table_id: '550e8400-e29b-41d4-a716-446655440004',
    customer_id: null,
    status: 'payment_pending' as const,
    total_amount: 520000,
    created_at: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
    updated_at: new Date(Date.now() - 300000).toISOString(),
    table: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      table_number: '3',
      location: 'Main Floor',
      restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
    },
    order_items: [
      {
        id: '750e8400-e29b-41d4-a716-446655440005',
        order_id: '650e8400-e29b-41d4-a716-446655440003',
        menu_item_id: '850e8400-e29b-41d4-a716-446655440005',
        quantity: 2,
        unit_price: 200000,
        total_price: 400000,
        status: 'served' as const,
        menu_item: {
          id: '850e8400-e29b-41d4-a716-446655440005',
          name: 'Ribeye Steak',
          price: 200000,
        },
        order_item_options: [],
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440006',
        order_id: '650e8400-e29b-41d4-a716-446655440003',
        menu_item_id: '850e8400-e29b-41d4-a716-446655440006',
        quantity: 2,
        unit_price: 60000,
        total_price: 120000,
        status: 'served' as const,
        menu_item: {
          id: '850e8400-e29b-41d4-a716-446655440006',
          name: 'Red Wine',
          price: 60000,
        },
        order_item_options: [],
      },
    ],
    payments: [],
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440004',
    table_id: '550e8400-e29b-41d4-a716-446655440005',
    customer_id: null,
    status: 'completed' as const,
    total_amount: 340000,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    table: {
      id: '550e8400-e29b-41d4-a716-446655440005',
      table_number: '7',
      location: 'Terrace',
      restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
    },
    order_items: [
      {
        id: '750e8400-e29b-41d4-a716-446655440007',
        order_id: '650e8400-e29b-41d4-a716-446655440004',
        menu_item_id: '850e8400-e29b-41d4-a716-446655440007',
        quantity: 3,
        unit_price: 90000,
        total_price: 270000,
        status: 'served' as const,
        menu_item: {
          id: '850e8400-e29b-41d4-a716-446655440007',
          name: 'Pasta Carbonara',
          price: 90000,
        },
        order_item_options: [],
      },
      {
        id: '750e8400-e29b-41d4-a716-446655440008',
        order_id: '650e8400-e29b-41d4-a716-446655440004',
        menu_item_id: '850e8400-e29b-41d4-a716-446655440008',
        quantity: 1,
        unit_price: 70000,
        total_price: 70000,
        status: 'served' as const,
        menu_item: {
          id: '850e8400-e29b-41d4-a716-446655440008',
          name: 'Tiramisu',
          price: 70000,
        },
        order_item_options: [],
      },
    ],
    payments: [
      {
        id: 'b50e8400-e29b-41d4-a716-446655440001',
        order_id: '650e8400-e29b-41d4-a716-446655440004',
        amount: 340000,
        payment_method: 'cash' as const,
        status: 'success' as const,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
];

@Injectable()
export class BillsRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Get order with all items for bill calculation
   */
  async getOrderForBill(orderId: string) {
    // Find order in mock data
    const order = MOCK_BILLS.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * Update order with bill totals
   */
  async updateOrderTotals(orderId: string, totalAmount: number) {
    const order = MOCK_BILLS.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.total_amount = totalAmount;
    order.updated_at = new Date().toISOString();

    return order;
  }

  /**
   * Create payment record
   */
  async createPayment(orderId: string, paymentData: UpdatePaymentData) {
    const order = MOCK_BILLS.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const newPayment = {
      id: `payment-${Date.now()}`,
      order_id: orderId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      status: 'success' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    order.payments.push(newPayment);
    return newPayment;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: Database['public']['Enums']['order_status'],
  ) {
    const order = MOCK_BILLS.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    (order as any).status = status;
    order.updated_at = new Date().toISOString();

    return order;
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

    // Filter mock bills
    let filteredBills = MOCK_BILLS.filter(
      (bill) => bill.table.restaurant_id === restaurantId,
    );

    // Apply status filter
    if (status) {
      filteredBills = filteredBills.filter((bill) => bill.status === status);
    }

    // Apply table number filter
    if (tableNumber) {
      filteredBills = filteredBills.filter(
        (bill) => bill.table.table_number === tableNumber,
      );
    }

    // Apply payment method filter
    if (paymentMethod) {
      filteredBills = filteredBills.filter((bill) =>
        bill.payments.some((p: any) => p.payment_method === paymentMethod),
      );
    }

    // Sort
    filteredBills.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === 'table_number') {
        aVal = parseInt(a.table.table_number);
        bVal = parseInt(b.table.table_number);
      } else if (sortBy === 'total_amount') {
        aVal = a.total_amount;
        bVal = b.total_amount;
      } else {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Pagination
    const total = filteredBills.length;
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const to = from + limit;
    const items = filteredBills.slice(from, to);

    return {
      items,
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
    const order = MOCK_BILLS.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }
}
