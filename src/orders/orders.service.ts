import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { OrdersGateway } from '../gateways/orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { TablesRepository } from '../tables/tables.repository';
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
    private readonly ordersRepository: OrdersRepository,
    private readonly tablesRepository: TablesRepository,
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

    // Get assigned waiter ID for the table
    const assignedWaiterId =
      await this.tablesRepository.getAssignedWaiterId(tableId);

    // Emit new order notification via WebSocket
    if (restaurantId && tableId && assignedWaiterId) {
      this.ordersGateway.notifyNewOrder(
        restaurantId as unknown as string,
        assignedWaiterId,
        {
          orderId: order.id,
        },
      );
      this.ordersGateway.emitOrderStatusUpdate(
        restaurantId as unknown as string,
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

    return order;
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
    this.ordersGateway.emitBillRequest(restaurantId, tableId, order.id);
    this.ordersGateway.emitOrderStatusUpdate(
      restaurantId,
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
  async updateOrderStatus(orderId: string, status: string) {
    const validStatuses = [
      'active',
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
      status as Database['public']['Enums']['order_status'],
    );

    const tableId = updatedOrder.table_id;
    const order = await this.ordersRepository.getOrderWithTable(orderId);
    const restaurantId = order?.tables.restaurant_id;

    // Emit status update via WebSocket if tableId and restaurantId provided
    if (tableId && restaurantId) {
      this.ordersGateway.emitOrderStatusUpdate(
        restaurantId,
        tableId,
        orderId,
        status as Database['public']['Enums']['order_status'],
      );
    }

    return updatedOrder;
  }
}
