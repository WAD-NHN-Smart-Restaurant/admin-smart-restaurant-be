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
        tableId,
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
      orderItems:
        order.order_items?.map((item: any) => ({
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
          orderItemOptions:
            item.order_item_options?.map((opt: any) => ({
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

  /**
   * Get revenue report by time range
   */
  async getRevenueReport(
    restaurantId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month',
  ) {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select(
        `
        id,
        created_at,
        total_amount,
        status,
        table_id,
        tables!inner(restaurant_id)
      `,
      )
      .eq('tables.restaurant_id', restaurantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['completed', 'served']);

    if (error) throw new BadRequestException(error.message);

    // Group by date format
    const revenueByPeriod: Record<
      string,
      { date: string; revenue: number; orderCount: number }
    > = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      let periodKey: string;

      if (groupBy === 'day') {
        periodKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = {
          date: periodKey,
          revenue: 0,
          orderCount: 0,
        };
      }

      revenueByPeriod[periodKey].revenue += order.total_amount || 0;
      revenueByPeriod[periodKey].orderCount += 1;
    });

    return Object.values(revenueByPeriod).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Get top revenue by menu items
   */
  async getTopMenuItems(
    restaurantId: string,
    startDate: string,
    endDate: string,
    limit: number = 10,
  ) {
    const { data: orderItems, error } = await this.supabase
      .from('order_items')
      .select(
        `
        id,
        menu_item_id,
        quantity,
        total_price,
        created_at,
        order_id,
        orders!inner(
          id,
          status,
          table_id,
          tables!inner(restaurant_id)
        ),
        menu_items!inner(
          id,
          name,
          price
        )
      `,
      )
      .eq('orders.tables.restaurant_id', restaurantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('orders.status', ['completed', 'served']);

    if (error) throw new BadRequestException(error.message);

    // Aggregate by menu item
    const menuItemStats: Record<
      string,
      {
        menuItemId: string;
        name: string;
        totalRevenue: number;
        totalQuantity: number;
      }
    > = {};

    orderItems.forEach((item) => {
      const menuItemId = item.menu_item_id;
      const menuItem = item.menu_items as unknown as {
        id: string;
        name: string;
        price: number;
      };

      if (!menuItemStats[menuItemId]) {
        menuItemStats[menuItemId] = {
          menuItemId,
          name: menuItem.name,
          totalRevenue: 0,
          totalQuantity: 0,
        };
      }

      menuItemStats[menuItemId].totalRevenue += item.total_price || 0;
      menuItemStats[menuItemId].totalQuantity += item.quantity || 0;
    });

    return Object.values(menuItemStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  /**
   * Get analytics chart data (orders per day, peak hours, popular items)
   */
  async getAnalyticsChartData(
    restaurantId: string,
    startDate: string,
    endDate: string,
  ) {
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select(
        `
        id,
        created_at,
        total_amount,
        status,
        table_id,
        tables!inner(restaurant_id),
        order_items(
          id,
          menu_item_id,
          quantity,
          menu_items(id, name)
        )
      `,
      )
      .eq('tables.restaurant_id', restaurantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['completed', 'served']);

    if (error) throw new BadRequestException(error.message);

    // Orders per day
    const ordersPerDay: Record<string, number> = {};
    // Peak hours (0-23)
    const ordersByHour: Record<number, number> = {};
    // Popular items
    const itemCounts: Record<string, { name: string; count: number }> = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      const dayKey = date.toISOString().split('T')[0];
      const hour = date.getHours();

      // Count orders per day
      ordersPerDay[dayKey] = (ordersPerDay[dayKey] || 0) + 1;

      // Count orders by hour
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;

      // Count popular items
      const orderItems = order.order_items as unknown as Array<{
        id: string;
        menu_item_id: string;
        quantity: number;
        menu_items: { id: string; name: string };
      }>;

      orderItems?.forEach((item) => {
        const menuItemId = item.menu_item_id;
        if (!itemCounts[menuItemId]) {
          itemCounts[menuItemId] = {
            name: item.menu_items.name,
            count: 0,
          };
        }
        itemCounts[menuItemId].count += item.quantity;
      });
    });

    // Format orders per day
    const ordersPerDayArray = Object.entries(ordersPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format peak hours
    const peakHoursArray = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: ordersByHour[i] || 0,
    }));

    // Format popular items (top 10)
    const popularItemsArray = Object.entries(itemCounts)
      .map(([menuItemId, data]) => ({
        menuItemId,
        name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ordersPerDay: ordersPerDayArray,
      peakHours: peakHoursArray,
      popularItems: popularItemsArray,
    };
  }
}
