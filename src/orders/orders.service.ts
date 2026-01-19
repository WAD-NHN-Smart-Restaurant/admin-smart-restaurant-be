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
   * Cancel bill request (change order status back to served)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cancelBillRequest(tableId: string, _restaurantId: string) {
    const order = await this.ordersRepository.getActiveOrderByTable(tableId);

    if (!order) {
      throw new NotFoundException('No active order found for this table');
    }

    if (order.status !== 'payment_pending') {
      throw new BadRequestException('Order is not in payment_pending status');
    }

    const updatedOrder = await this.ordersRepository.updateOrderStatus(
      order.id,
      'preparing',
    );

    // Emit status update
    this.ordersGateway.emitOrderStatusUpdate(tableId, order.id, 'preparing');
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
}
