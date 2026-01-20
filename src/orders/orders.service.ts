import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';

type OrderItemOptionRow =
  Database['public']['Tables']['order_item_options']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'] & {
  order_item_options?: OrderItemOptionRow[];
};
type OrderRow = Database['public']['Tables']['orders']['Row'] & {
  order_items?: OrderItemRow[];
};

@Injectable()
export class OrdersService {
  constructor(
    private ordersRepository: OrdersRepository,
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * Create new order or add items to existing active order
   */
  async createOrAddOrder(
    tableId: string,
    restaurantId: string,
    createOrderDto: CreateOrderDto,
    guestName?: string,
    notes?: string,
  ) {
    // Get menu items to validate and get prices
    const menuItemIds = createOrderDto.items.map((item) => item.menuItemId);
    const { data: menuItems, error: menuError } = await this.supabase
      .from('menu_items')
      .select('id, name, price, category_id')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId);

    if (menuError) throw new BadRequestException(menuError.message);
    if (!menuItems || menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items not found');
    }

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    // Check for existing active order
    const existingOrder =
      await this.ordersRepository.getActiveOrderByTable(tableId);

    let order;
    if (existingOrder) {
      // Add items to existing order
      order = existingOrder;
      await this.ordersRepository.addOrderItems(
        order.id,
        createOrderDto.items,
        menuItemMap,
      );
    } else {
      // Create new order
      order = await this.ordersRepository.createOrder(
        tableId,
        restaurantId,
        guestName,
        notes,
      );
      // Add items to new order
      await this.ordersRepository.addOrderItems(
        order.id,
        createOrderDto.items,
        menuItemMap,
      );
    }

    // Calculate and update total
    const updatedOrder = await this.ordersRepository.getOrderById(order.id);
    const totalAmount = this.calculateOrderTotal(updatedOrder);
    await this.ordersRepository.updateOrderTotal(order.id, totalAmount);

    // Emit new order notification via WebSocket
    if (restaurantId && tableId) {
      this.ordersGateway.emitNewOrderNotification(
        order.id,
        restaurantId as unknown as string,
      );
      this.ordersGateway.emitOrderStatusUpdate(
        tableId as unknown as string,
        order.id,
        order.status || '',
      );
    }

    return { ...updatedOrder, total_amount: totalAmount };
  }

  /**
   * Get active order for a table (for guest)
   */
  async getActiveOrderForGuest(tableId: string) {
    const order = await this.ordersRepository.getActiveOrderByTable(tableId);

    if (!order) {
      throw new NotFoundException('No active order found for this table');
    }

    // Transform the response to flatten nested menu_items and modifier_options
    return this.transformOrderResponse(order);
  }

  /**
   * Transform order response to flatten nested relations
   */
  private transformOrderResponse(order: any) {
    if (!order) return null;

    return {
      ...order,
      orderItems: order.order_items?.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        menuItemId: item.menu_item_id,
        menuItemName: item.menu_items?.name || null,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        notes: item.notes,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        totalPrice: item.total_price,
        orderItemOptions: item.order_item_options?.map((opt: any) => ({
          id: opt.id,
          orderItemId: opt.order_item_id,
          modifierOptionId: opt.modifier_option_id,
          optionName: opt.modifier_options?.name || null,
          priceAtTime: opt.price_at_time,
          createdAt: opt.created_at,
        })) || [],
      })) || [],
      order_items: undefined, // Remove snake_case field
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    const order = await this.ordersRepository.getOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Request bill (change order status to payment_pending)
   */
  async requestBill(tableId: string, restaurantId: string) {
    const order = await this.ordersRepository.getActiveOrderByTable(tableId);

    if (!order) {
      throw new NotFoundException('No active order found for this table');
    }

    const updatedOrder = await this.ordersRepository.updateOrderStatus(
      order.id,
      'payment_pending',
    );

    // Emit bill request notification
    this.ordersGateway.emitBillRequest(tableId, order.id, restaurantId);
    this.ordersGateway.emitOrderStatusUpdate(
      tableId,
      order.id,
      'payment_pending',
    );

    return updatedOrder;
  }

  /**
   * Calculate order total (sum of all items with modifiers)
   */
  private calculateOrderTotal(order: OrderRow | null): number {
    const items = order?.order_items ?? [];
    return items.reduce((total: number, item: OrderItemRow) => {
      const qty = item.quantity ?? 1;
      let itemTotal = (item.unit_price ?? 0) * qty;

      const options = item.order_item_options ?? [];
      const optionsTotal = options.reduce(
        (sum: number, option: OrderItemOptionRow) =>
          sum + (option.price_at_time ?? 0),
        0,
      );
      itemTotal += optionsTotal * qty;

      return total + itemTotal;
    }, 0);
  }

  /**
   * Get orders for restaurant admin
   */
  async getRestaurantOrders(restaurantId: string, limit = 50, offset = 0) {
    const { data, count } = await this.ordersRepository.getOrdersByRestaurant(
      restaurantId,
      limit,
      offset,
    );

    return {
      data: data.map((order) => ({
        ...order,
        total_amount: this.calculateOrderTotal(order),
      })),
      count,
    };
  }

  /**
   * Update order status (admin/kitchen)
   */
  async updateOrderStatus(orderId: string, status: string, tableId?: string) {
    const validStatuses = [
      'pending',
      'accepted',
      'rejected',
      'preparing',
      'ready',
      'served',
      'completed',
      'cancelled',
      'payment_pending',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    const updatedOrder = await this.ordersRepository.updateOrderStatus(
      orderId,
      status,
    );

    // Emit status update via WebSocket if tableId provided
    if (tableId) {
      this.ordersGateway.emitOrderStatusUpdate(tableId, orderId, status);
    }

    return updatedOrder;
  }

  /**
   * Get order history for a customer
   */
  async getCustomerOrderHistory(customerId: string, limit = 20, offset = 0) {
    const { data, error, count } = await this.supabase
      .from('orders')
      .select(
        `
        id,
        status,
        total_amount,
        guest_name,
        created_at,
        updated_at,
        customer_id,
        tables (
          table_number
        ),
        order_items (
          id
        )
      `,
        { count: 'exact' },
      )
      .eq('customer_id', customerId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(
        `[getCustomerOrderHistory] Error fetching orders for customer ${customerId}:`,
        error,
      );
      throw new BadRequestException(error.message);
    }

    console.log(
      `[getCustomerOrderHistory] Found ${data.length} orders for customer ${customerId}`,
    );

    return {
      data: data.map((order) => ({
        id: order.id,
        tableNumber: order.tables?.table_number,
        status: order.status,
        totalAmount: order.total_amount,
        guestName: order.guest_name,
        createdAt: order.created_at,
        completedAt: order.updated_at,
        orderItemsCount: order.order_items?.length || 0,
      })),
      count: count || 0,
    };
  }

  /**
   * Get detailed order with item processing statuses
   */
  async getOrderDetails(orderId: string, customerId?: string) {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select(
        `
        id,
        status,
        total_amount,
        guest_name,
        created_at,
        updated_at,
        customer_id,
        tables (
          table_number
        ),
        order_items (
          id,
          quantity,
          unit_price,
          special_request,
          status,
          created_at,
          menu_items (
            id,
            name,
            description,
            menu_item_photos (
              url,
              is_primary
            )
          ),
          order_item_options (
            id,
            price_at_time,
            modifier_options (
              name
            )
          )
        )
      `,
      )
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error(
        `[getOrderDetails] Error fetching order ${orderId}:`,
        error,
      );
      throw new NotFoundException('Order not found');
    }

    // If customerId is provided, verify the order belongs to the customer or has no customer
    if (customerId && order.customer_id && order.customer_id !== customerId) {
      console.error(
        `[getOrderDetails] Customer ${customerId} tried to access order ${orderId} owned by customer ${order.customer_id}`,
      );
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Create a review for a menu item
   */
  async createReview(
    customerId: string,
    menuItemId: string,
    orderId: string,
    rating: number,
    comment?: string,
  ) {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if order belongs to customer and is completed
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      throw new BadRequestException(
        'Order not found or does not belong to you',
      );
    }

    if (order.status !== 'completed') {
      throw new BadRequestException('You can only review completed orders');
    }

    // Check if the menu item was in this order
    const { data: orderItem, error: itemError } = await this.supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('menu_item_id', menuItemId)
      .single();

    if (itemError || !orderItem) {
      throw new BadRequestException(
        'This menu item was not part of your order',
      );
    }

    // Check if review already exists
    const { data: existingReview } = await (this.supabase as any)
      .from('reviews')
      .select('id')
      .eq('customer_id', customerId)
      .eq('menu_item_id', menuItemId)
      .eq('order_id', orderId)
      .single();

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this item for this order',
      );
    }

    // Create review
    const { data: review, error: reviewError } = await (this.supabase as any)
      .from('reviews')
      .insert({
        customer_id: customerId,
        menu_item_id: menuItemId,
        order_id: orderId,
        rating,
        comment,
      })
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        updated_at,
        profiles (
          full_name
        ),
        menu_items (
          name
        )
      `,
      )
      .single();

    if (reviewError) throw new BadRequestException(reviewError.message);

    return review;
  }

  /**
   * Get reviews for a menu item
   */
  async getMenuItemReviews(menuItemId: string, limit = 10, offset = 0) {
    const { data, error, count } = await (this.supabase as any)
      .from('reviews')
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        profiles (
          full_name
        )
      `,
        { count: 'exact' },
      )
      .eq('menu_item_id', menuItemId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      count: count || 0,
    };
  }

  /**
   * Get customer's reviews
   */
  async getCustomerReviews(customerId: string, limit = 20, offset = 0) {
    const { data, error, count } = await (this.supabase as any)
      .from('reviews')
      .select(
        `
        id,
        rating,
        comment,
        created_at,
        updated_at,
        menu_items (
          id,
          name,
          menu_item_photos (
            url,
            is_primary
          )
        ),
        orders (
          id,
          created_at
        )
      `,
        { count: 'exact' },
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      count: count || 0,
    };
  }
}
