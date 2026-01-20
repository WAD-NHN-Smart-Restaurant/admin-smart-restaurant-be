import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('OrdersGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join restaurant room for notifications (for waiters/kitchen)
   */
  @SubscribeMessage('join-restaurant')
  handleJoinRestaurant(
    @MessageBody()
    data: {
      restaurantId?: string;
      role: string;
      waiterId?: string;
      assignedTableIds?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { restaurantId, role, waiterId, assignedTableIds } = data;

    // Use restaurant_id if provided, otherwise use 'default'
    const room = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';

    // Also join role-specific rooms
    if (role) {
      if (role === 'kitchen') {
        void client.join(`${room}:${role}`);
      }
      // For waiters, also join room for each assigned table
      if (
        role === 'waiter' &&
        waiterId &&
        assignedTableIds &&
        assignedTableIds.length > 0
      ) {
        assignedTableIds.forEach((tableId) => {
          void client.join(`table:${tableId}:waiter`);
        });
        // console.log(
        //   `Waiter ${waiterId} (client ${client.id}) joined ${assignedTableIds.length} table rooms`,
        // );
      }
    }

    // this.logger.log(`Client ${client.id} joined room: ${room} as ${role}`);
    // this.logger.log(
    //   `Client ${client.id} rooms: ${JSON.stringify([...client.rooms])}`,
    // );

    return { success: true, room };
  }

  /**
   * Guest joins a table room to receive order updates
   * Guests only join table-specific rooms, not restaurant rooms
   */
  @SubscribeMessage('join-table')
  handleJoinTable(
    @MessageBody() data: { table_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { table_id } = data;

    // Join table-specific room only (guests don't need restaurant-wide updates)
    void client.join(`table:${table_id}`);

    this.logger.log(`Client ${client.id} joined table:${table_id}`);
    return {
      success: true,
      message: `Joined table:${table_id}`,
    };
  }

  /**
   * Leave restaurant room
   */
  @SubscribeMessage('leave-restaurant')
  handleLeaveRestaurant(
    @MessageBody() data: { restaurantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = data.restaurantId
      ? `restaurant:${data.restaurantId}`
      : 'restaurant:default';
    void client.leave(room);
    // this.logger.log(`Client ${client.id} left room: ${room}`);
    return { success: true };
  }

  /**
   * Notify new order to waiters
   */
  notifyNewOrder(
    restaurantId: string,
    tableId: string,
    assignedWaiterId: string,
    orderData: Record<string, unknown>,
  ) {
    console.log('notifyNewOrder called with:', {
      restaurantId,
      tableId,
      assignedWaiterId,
      orderData,
    });
    const room = restaurantId
      ? `restaurant:${restaurantId}:waiter`
      : 'restaurant:default';

    // Also notify waiter assigned to this table specifically

    if (assignedWaiterId && tableId) {
      const waiterTableRoom = `table:${tableId}:waiter`;
      this.server.to(waiterTableRoom).emit('new-order', {
        type: 'new-order',
        data: orderData,
        timestamp: new Date().toISOString(),
        sound: true,
      });
    }

    // Still send to general waiter room for admin/supervisor
    this.server.to(room).emit('new-order', {
      type: 'new-order',
      data: orderData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`New order notification sent to room: ${room}`);
  }

  /**
   * Notify order accepted/rejected to guests and staff
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   * @param orderItemData - The order item data with status change
   * @param status - 'accepted' or 'rejected'
   */
  notifyOrderItemStatus(
    restaurantId: string,
    tableId: string,
    orderItemData: Record<string, unknown>,
    status: 'accepted' | 'rejected',
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('order-item-updated', {
      order_item_id: orderItemData['id'],
      status,
      rejected_reason: orderItemData['rejected_reason'],
      timestamp: new Date().toISOString(),
    });

    // Notify staff (kitchen) in restaurant room
    this.server.to(restaurantRoom).emit('order-item-updated', {
      order_item_id: orderItemData['id'],
      status,
      rejected_reason: orderItemData['rejected_reason'],
      timestamp: new Date().toISOString(),
    });

    // Notify kitchen if accepted
    if (status === 'accepted') {
      this.server.to(restaurantRoom).emit('order-accepted', {
        type: 'order-accepted',
        data: orderItemData,
        timestamp: new Date().toISOString(),
      });
    }

    // Notify waiters about status changes
    this.server.to(restaurantRoom).emit('order-status-update', {
      type: 'order-item-status',
      status,
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Order item ${status} notification sent to ${restaurantRoom}`,
    );
  }

  /**
   * Emit order status update to guests and staff
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   */
  emitOrderStatusUpdate(
    restaurantId: string,
    tableId: string,
    orderId: string,
    status: string,
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('order-status-updated', {
      order_id: orderId,
      status,
      timestamp: new Date().toISOString(),
    });

    // Notify staff in restaurant room
    this.server.to(restaurantRoom).emit('order-status-updated', {
      order_id: orderId,
      status,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted order-status-updated to guests (${tableRoom}) and staff (${restaurantRoom}): ${orderId} -> ${status}`,
    );
  }

  /**
   * Emit order item status update to guests and staff
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   */
  emitOrderItemStatusUpdate(
    restaurantId: string,
    tableId: string,
    orderItemId: string,
    status: string,
    rejectedReason?: string,
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('order-item-updated', {
      order_item_id: orderItemId,
      status,
      rejected_reason: rejectedReason,
      timestamp: new Date().toISOString(),
    });

    // Notify staff in restaurant room
    this.server.to(restaurantRoom).emit('order-item-updated', {
      order_item_id: orderItemId,
      status,
      rejected_reason: rejectedReason,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Emitted order-item-updated to guests (${tableRoom}) and staff (${restaurantRoom}): ${orderItemId} -> ${status}`,
    );
  }

  /**
   * Emit bill request to waiters (staff only, not guests)
   */
  emitBillRequest(restaurantId: string, tableId: string, orderId: string) {
    const room = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    this.server.to(`table:${tableId}:waiter`).emit('bill-requested', {
      order_id: orderId,
      table_id: tableId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted bill-requested from table:${tableId} to staff (${room})`,
    );
  }

  /**
   * Emit call waiter request (staff only, not guests)
   */
  emitCallWaiter(restaurantId: string, tableId: string) {
    const room = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';

    // Emit to general restaurant room
    this.server.to(room).emit('waiter-called', {
      table_id: tableId,
      timestamp: new Date().toISOString(),
    });

    // Also emit specifically to waiter assigned to this table
    // Note: We need to query the table to get assigned_waiter_id
    // For now, emit to a table-specific waiter room pattern
    this.server.to(`table:${tableId}:waiter`).emit('call-waiter', {
      table_id: tableId,
      timestamp: new Date().toISOString(),
      sound: true,
    });

    this.logger.log(
      `Emitted waiter-called from table:${tableId} to staff (${room})`,
    );
  }

  /**
   * Notify kitchen when orders are sent
   */
  notifyKitchen(
    restaurantId: string,
    tableId: string,
    orderItems: Record<string, unknown>[],
  ) {
    const room = restaurantId
      ? `restaurant:${restaurantId}:kitchen`
      : 'restaurant:default';

    this.server.to(room).emit('orders-to-prepare', {
      type: 'orders-to-prepare',
      data: orderItems,
      timestamp: new Date().toISOString(),
      sound: true, // Trigger sound notification
    });
    console.log({ tableId });
    // notify to guest in table as well
    const tableRoom = `table:${tableId}`;

    this.server.to(tableRoom).emit('order-item-updated', {
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Kitchen notification sent to room: ${room}, items: ${orderItems.length}`,
    );
  }

  /**
   * Notify waiters when orders are ready
   */
  notifyOrderReady(
    restaurantId: string,
    tableId: string,
    assignedWaiterId: string,
    orderItemData: Record<string, unknown>,
    status?: string,
  ) {
    console.log('notifyOrderReady called with:', {
      restaurantId,
      tableId,
      orderItemData,
    });
    const room = restaurantId
      ? `restaurant:${restaurantId}:waiter`
      : 'restaurant:default';

    console.log({ tableId });
    const tableRoom = `table:${tableId}`;

    // Notify guests at table
    this.server.to(tableRoom).emit('order-item-updated', {
      timestamp: new Date().toISOString(),
    });

    // Notify waiter assigned to this table
    if (assignedWaiterId && status === 'ready') {
      const waiterTableRoom = `table:${tableId}:waiter`;
      this.server.to(waiterTableRoom).emit('order-ready', {
        type: 'order-ready',
        data: orderItemData,
        timestamp: new Date().toISOString(),
        sound: true,
      });
    }

    // Also send to general waiter room
    this.server.to(room).emit('order-ready', {
      type: 'order-ready',
      data: orderItemData,
      timestamp: new Date().toISOString(),
      sound: true,
    });
    this.logger.log(`Order ready notification sent to room: ${room}`);
  }

  /**
   * Notify guests and staff when order is served
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   * @param orderItemData - The order item data
   */
  notifyOrderServed(
    restaurantId: string,
    tableId: string,
    orderItemData: Record<string, unknown>,
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('order-item-updated', {
      order_item_id: orderItemData['id'],
      status: 'served',
      timestamp: new Date().toISOString(),
    });

    // Notify staff in restaurant room
    this.server.to(restaurantRoom).emit('order-item-updated', {
      order_item_id: orderItemData['id'],
      status: 'served',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Order served notification sent to guests (${tableRoom}) and staff (${restaurantRoom})`,
    );
  }

  /**
   * Notify waiters when kitchen rejects an order item
   */
  notifyOrderItemRejected(
    restaurantId: string,
    tableId: string,
    orderItemData: Record<string, unknown>,
  ) {
    const room = restaurantId
      ? `restaurant:${restaurantId}:waiter`
      : 'restaurant:default';

    const tableRoom = `table:${tableId}`;

    this.server.to(tableRoom).emit('order-item-updated', {
      timestamp: new Date().toISOString(),
    });

    this.server.to(room).emit('order-item-rejected', {
      type: 'order-item-rejected',
      data: orderItemData,
      timestamp: new Date().toISOString(),
      sound: true,
    });
    this.logger.log(`Order item rejected notification sent to room: ${room}`);
  }

  /**
   * Notify guests and staff about bill creation
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   * @param billData - The bill data
   */
  notifyBillCreated(
    restaurantId: string,
    tableId: string,
    billData: Record<string, unknown>,
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('bill-created', {
      type: 'bill-created',
      data: billData,
      timestamp: new Date().toISOString(),
    });

    // Notify staff in restaurant room
    this.server.to(restaurantRoom).emit('bill-created', {
      type: 'bill-created',
      data: billData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Bill created notification sent to guests (${tableRoom}) and staff (${restaurantRoom})`,
    );
  }

  /**
   * Notify guests and staff about payment completion
   * @param restaurantId - The restaurant ID
   * @param tableId - The table ID (for table-specific rooms)
   * @param paymentData - The payment data
   */
  notifyPaymentCompleted(
    restaurantId: string,
    tableId: string,
    paymentData: Record<string, unknown>,
  ) {
    const restaurantRoom = restaurantId
      ? `restaurant:${restaurantId}`
      : 'restaurant:default';
    const tableRoom = `table:${tableId}`;

    // Notify guests at this table
    this.server.to(tableRoom).emit('payment-completed', {
      type: 'payment-completed',
      data: paymentData,
      timestamp: new Date().toISOString(),
    });

    // Notify staff in restaurant room
    this.server.to(restaurantRoom).emit('payment-completed', {
      type: 'payment-completed',
      data: paymentData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Payment completed notification sent to guests (${tableRoom}) and staff (${restaurantRoom})`,
    );
  }
}
