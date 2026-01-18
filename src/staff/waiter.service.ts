import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { WaiterRepository } from './waiter.repository';
import {
  AcceptOrderItemDto,
  RejectOrderItemDto,
  SendToKitchenDto,
  MarkAsServedDto,
} from './dto/waiter-action.dto';
import { OrdersGateway } from '../gateways/orders.gateway';

@Injectable()
export class WaiterService {
  constructor(
    private waiterRepository: WaiterRepository,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  /**
   * Get waiter orders with filtering
   */
  async getWaiterOrders(
    restaurantId: string,
    filters: {
      search?: string;
      status?: 'pending' | 'accepted' | 'ready' | 'served' | 'payment_pending';
      tableId?: string;
      startDate?: string;
      waiterId?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    // Delegate to repository layer for data access and pagination
    return this.waiterRepository.getWaiterOrders(restaurantId, filters);
  }

  /**
   * Accept an order item
   */
  async acceptOrderItem(orderItemId: string, dto: AcceptOrderItemDto) {
    const orderItem = await this.waiterRepository.getOrderItemById(orderItemId);

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.status !== 'pending') {
      throw new Error(
        `Cannot accept order item with status: ${orderItem.status}`,
      );
    }

    const updatedItem = await this.waiterRepository.updateOrderItemStatus(
      orderItemId,
      'accepted',
    );

    // Notify via WebSocket
    const tableId = updatedItem.order.table_id;
    const restaurantId = updatedItem.menu_item.restaurant_id;

    if (tableId && restaurantId) {
      this.ordersGateway.notifyOrderItemStatus(
        restaurantId,
        tableId,
        updatedItem,
        'accepted',
      );
    } else {
      console.warn(
        'Table ID or Restaurant ID not found for order item:',
        orderItemId,
      );
    }

    return {
      message: 'Order item accepted successfully',
      orderItem: updatedItem,
    };
  }

  /**
   * Reject an order item with reason
   */
  async rejectOrderItem(orderItemId: string, dto: RejectOrderItemDto) {
    const orderItem = await this.waiterRepository.getOrderItemById(orderItemId);

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.status !== 'pending') {
      throw new Error(
        `Cannot reject order item with status: ${orderItem.status}`,
      );
    }

    const updatedItem = await this.waiterRepository.updateOrderItemStatus(
      orderItemId,
      'rejected',
    );

    // Recalculate order total amount (excluding rejected items)
    await this.waiterRepository.recalculateOrderTotal(updatedItem.order_id);

    // Notify via WebSocket
    const tableId = updatedItem.order.table_id;
    const restaurantId = updatedItem.menu_item.restaurant_id;

    if (tableId && restaurantId) {
      this.ordersGateway.notifyOrderItemStatus(
        restaurantId,
        tableId,
        updatedItem,
        'rejected',
      );
    } else {
      console.warn(
        'Table ID or Restaurant ID not found for order item:',
        orderItemId,
      );
    }
    return {
      message: 'Order item rejected',
      reason: dto.reason,
      orderItem: updatedItem,
    };
  }

  /**
   * Send pending order items to kitchen
   */
  async sendToKitchen(dto: SendToKitchenDto) {
    const { order_item_ids } = dto;
    // Verify all items are in accepted status
    const items = await Promise.all(
      order_item_ids.map((id) => this.waiterRepository.getOrderItemById(id)),
    );
    const invalidItems = items.filter(
      (item) => item && item.status !== 'pending',
    );

    if (invalidItems.length > 0) {
      throw new Error(
        'All order items must be in pending status before sending to kitchen',
      );
    }

    const updatedItems =
      await this.waiterRepository.updateMultipleOrderItemsStatus(
        order_item_ids,
        'accepted',
      );
    // Notify kitchen via WebSocket
    console.log('updatedItems', updatedItems);

    if (updatedItems.length > 0) {
      const order = updatedItems[0];
      const restaurantId = order?.menu_item?.restaurant_id;
      const tableId = order?.order?.table_id;
      if (restaurantId && tableId) {
        this.ordersGateway.notifyKitchen(restaurantId, tableId, updatedItems);
      }
    }

    return {
      message: 'Orders sent to kitchen',
      orderItems: updatedItems,
    };
  }

  /**
   * Mark order items as served
   */
  async markAsServed(dto: MarkAsServedDto) {
    const { order_item_ids } = dto;

    // Verify all items are ready
    // const items = await Promise.all(
    //   order_item_ids.map((id) => this.waiterRepository.getOrderItemById(id)),
    // );

    // For now, allow marking any status as served (in mock mode)
    // In production, uncomment the strict check below:
    // const invalidItems = items.filter(
    //   (item) => item && item.status !== 'ready',
    // );
    // if (invalidItems.length > 0) {
    //   throw new Error('All order items must be ready before marking as served');
    // }

    const updatedItems =
      await this.waiterRepository.updateMultipleOrderItemsStatus(
        order_item_ids,
        'served',
      );

    // Notify customer via WebSocket
    if (updatedItems.length > 0) {
      const tableId = updatedItems[0].order.table_id;
      const restaurantId = updatedItems[0].menu_item.restaurant_id;
      if (tableId && restaurantId) {
        // Send each item individually
        updatedItems.forEach((item) => {
          this.ordersGateway.notifyOrderServed(restaurantId, tableId, item);
        });
      } else {
        console.warn('Table ID or Restaurant ID not found for order items');
      }
    }

    return {
      message: 'Orders marked as served',
      orderItems: updatedItems,
    };
  }

  /**
   * Get assigned tables for waiter
   */
  async getAssignedTables(waiterId: string, restaurantId: string) {
    const tables = await this.waiterRepository.getAssignedTables(
      waiterId,
      restaurantId,
    );

    return tables.map((table) => ({
      ...table,
      hasActiveOrder: Array.isArray(table.orders)
        ? table.orders.some((order: any) => order.status === 'active')
        : false,
      activeOrdersCount: Array.isArray(table.orders)
        ? table.orders.filter((order: any) => order.status === 'active').length
        : 0,
    }));
  }

  /**
   * Get orders for a specific table
   */
  async getTableOrders(tableId: string) {
    return this.waiterRepository.getOrdersByTable(tableId);
  }
}
