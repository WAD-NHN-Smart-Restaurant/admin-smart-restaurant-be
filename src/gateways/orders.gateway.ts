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
   * Join restaurant room for notifications
   */
  @SubscribeMessage('join-restaurant')
  handleJoinRestaurant(
    @MessageBody() data: { restaurantId?: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { restaurantId, role } = data;

    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}`;
    // For now, use a default room for testing
    const room = 'restaurant:default';

    void client.join(room);

    // Also join role-specific rooms
    // if (role) {
    //   void client.join(`${room}:${role}`);
    // }

    this.logger.log(`Client ${client.id} joined room: ${room} as ${role}`);
    this.logger.log(
      `Client ${client.id} rooms: ${JSON.stringify([...client.rooms])}`,
    );

    return { success: true, room };
  }

  /**
   * Leave restaurant room
   */
  @SubscribeMessage('leave-restaurant')
  handleLeaveRestaurant(
    @MessageBody() data: { restaurantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // const room = `restaurant:${data.restaurantId}`;
    const room = 'restaurant:default';
    void client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { success: true };
  }

  /**
   * Notify new order to waiters
   */
  notifyNewOrder(restaurantId: string, orderData: Record<string, unknown>) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}:waiter`;
    const room = 'restaurant:default';

    this.server.to(room).emit('new-order', {
      type: 'new-order',
      data: orderData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`New order notification sent to room: ${room}`);
  }

  /**
   * Notify order accepted/rejected to customer and kitchen
   */
  notifyOrderItemStatus(
    restaurantId: string,
    orderItemData: Record<string, unknown>,
    status: 'accepted' | 'rejected',
  ) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}`;
    const room = 'restaurant:default';

    // Notify customers
    this.server.to(`${room}:customer`).emit('order-status-update', {
      type: 'order-item-status',
      status,
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });

    // Notify kitchen if accepted (so they can see the accepted order)
    if (status === 'accepted') {
      this.server.to(`${room}`).emit('order-accepted', {
        type: 'order-accepted',
        data: orderItemData,
        timestamp: new Date().toISOString(),
        // sound: false, // No sound for individual accepts, only when sent to kitchen
      });
      console.log(`Order item accepted notification sent to kitchen: ${room}`);
    }

    // Also notify waiters about status changes
    this.server.to(`${room}`).emit('order-status-update', {
      type: 'order-item-status',
      status,
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Order item ${status} notification sent for restaurant: ${restaurantId || 'default'}`,
    );
  }

  /**
   * Notify kitchen when orders are sent
   */
  notifyKitchen(restaurantId: string, orderItems: Record<string, unknown>[]) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}:kitchen`;
    const room = 'restaurant:default';

    this.server.to(room).emit('orders-to-prepare', {
      type: 'orders-to-prepare',
      data: orderItems,
      timestamp: new Date().toISOString(),
      sound: true, // Trigger sound notification
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
    orderItemData: Record<string, unknown>,
  ) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}:waiter`;
    const room = 'restaurant:default';

    this.server.to(room).emit('order-ready', {
      type: 'order-ready',
      data: orderItemData,
      timestamp: new Date().toISOString(),
      sound: true,
    });
    this.logger.log(`Order ready notification sent to room: ${room}`);
  }

  /**
   * Notify customer when order is served
   */
  notifyOrderServed(
    restaurantId: string,
    orderItemData: Record<string, unknown>,
  ) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}:customer`;
    const room = 'restaurant:default';

    this.server.to(room).emit('order-served', {
      type: 'order-served',
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Order served notification sent to room: ${room}`);
  }

  /**
   * Notify waiters when kitchen rejects an order item
   */
  notifyOrderItemRejected(
    restaurantId: string,
    orderItemData: Record<string, unknown>,
  ) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}:waiter`;
    const room = 'restaurant:default';

    this.server.to(room).emit('order-item-rejected', {
      type: 'order-item-rejected',
      data: orderItemData,
      timestamp: new Date().toISOString(),
      sound: true,
    });
    this.logger.log(`Order item rejected notification sent to room: ${room}`);
  }

  /**
   * Notify about bill creation
   */
  notifyBillCreated(restaurantId: string, billData: Record<string, unknown>) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}`;
    const room = 'restaurant:default';
    this.server.to(room).emit('bill-created', {
      type: 'bill-created',
      data: billData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Bill created notification sent for restaurant: default`);
  }

  /**
   * Notify about payment completion
   */
  notifyPaymentCompleted(
    restaurantId: string,
    paymentData: Record<string, unknown>,
  ) {
    // TODO: Uncomment when restaurant_id is available
    // const room = `restaurant:${restaurantId}`;
    const room = 'restaurant:default';

    this.server.to(room).emit('payment-completed', {
      type: 'payment-completed',
      data: paymentData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Payment completed notification sent for restaurant: default`,
    );
  }
}
