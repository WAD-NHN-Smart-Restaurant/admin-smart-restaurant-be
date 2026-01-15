import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { KitchenRepository } from './kitchen.repository';
import { OrdersGateway } from '../gateways/orders.gateway';
import {
  UpdateOrderItemStatusDto,
  BulkUpdateOrderItemsDto,
  GetKitchenOrdersQueryDto,
} from './dto/kitchen-action.dto';

@Injectable()
export class KitchenService {
  constructor(
    private kitchenRepository: KitchenRepository,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  /**
   * Get kitchen orders with filtering
   */
  async getKitchenOrders(
    restaurantId: string,
    filters: GetKitchenOrdersQueryDto = {},
  ) {
    return this.kitchenRepository.getKitchenOrders(restaurantId, filters);
  }

  /**
   * Update order item status (preparing or ready)
   */
  async updateOrderItemStatus(dto: UpdateOrderItemStatusDto) {
    const { order_item_id, status, note } = dto;

    // Get order item to check current status
    const orderItem =
      await this.kitchenRepository.getOrderItemById(order_item_id);

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Validate status transitions
    if (status === 'preparing' && orderItem.status !== 'accepted') {
      throw new BadRequestException(
        'Order item must be in accepted status to start preparing',
      );
    }

    if (status === 'ready' && orderItem.status !== 'preparing') {
      throw new BadRequestException(
        'Order item must be in preparing status to mark as ready',
      );
    }

    const updatedItem = await this.kitchenRepository.updateOrderItemStatus(
      order_item_id,
      status,
      note,
    );

    // Get restaurant ID from the order
    const order = updatedItem.order as unknown as {
      table?: { restaurant_id?: string };
    };
    const restaurantId = order?.table?.restaurant_id;

    // Notify via WebSocket
    if (restaurantId) {
      if (status === 'ready') {
        // Notify waiters that order is ready
        this.ordersGateway.notifyOrderReady(restaurantId, updatedItem);
      }
    }

    return {
      success: true,
      message: `Order item marked as ${status}`,
      data: updatedItem,
    };
  }

  /**
   * Bulk update order items status
   */
  async bulkUpdateOrderItems(dto: BulkUpdateOrderItemsDto) {
    const { order_item_ids, status } = dto;

    // Validate all items exist and have correct status
    const validationPromises = order_item_ids.map((id) =>
      this.kitchenRepository.getOrderItemById(id),
    );

    const items = await Promise.all(validationPromises);

    // Check for any null items
    const missingItems = items.filter((item) => !item);
    if (missingItems.length > 0) {
      throw new NotFoundException('One or more order items not found');
    }

    // Validate status transitions
    if (status === 'preparing') {
      const invalidItems = items.filter((item) => item.status !== 'accepted');
      if (invalidItems.length > 0) {
        throw new BadRequestException(
          'All order items must be in accepted status to start preparing',
        );
      }
    }

    if (status === 'ready') {
      const invalidItems = items.filter((item) => item.status !== 'preparing');
      if (invalidItems.length > 0) {
        throw new BadRequestException(
          'All order items must be in preparing status to mark as ready',
        );
      }
    }

    const updatedItems = await this.kitchenRepository.bulkUpdateOrderItems(
      order_item_ids,
      status,
    );

    // Notify via WebSocket
    if (status === 'ready' && updatedItems.length > 0) {
      const order = updatedItems[0].order as unknown as {
        table?: { restaurant_id?: string };
      };
      const restaurantId = order?.table?.restaurant_id;

      if (restaurantId) {
        // Notify waiters for each item
        updatedItems.forEach((item) => {
          this.ordersGateway.notifyOrderReady(restaurantId, item);
        });
      }
    }

    return {
      success: true,
      message: `${updatedItems.length} order items marked as ${status}`,
      data: updatedItems,
    };
  }

  /**
   * Reject order item
   */
  async rejectOrderItem(orderItemId: string, reason: string) {
    // Get order item to check if it exists
    const orderItem =
      await this.kitchenRepository.getOrderItemById(orderItemId);

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Only accept rejection from accepted status
    if (orderItem.status !== 'accepted') {
      throw new BadRequestException(
        'Only order items in accepted status can be rejected',
      );
    }

    const updatedItem = await this.kitchenRepository.updateOrderItemStatus(
      orderItemId,
      'rejected',
      reason,
    );

    // Get restaurant ID from the order
    const order = updatedItem.order as unknown as {
      table?: { restaurant_id?: string };
    };
    const restaurantId = order?.table?.restaurant_id;

    // Notify via WebSocket
    if (restaurantId) {
      this.ordersGateway.notifyOrderItemRejected(restaurantId, updatedItem);
    }

    return {
      success: true,
      message: 'Order item rejected',
      data: updatedItem,
    };
  }
}
