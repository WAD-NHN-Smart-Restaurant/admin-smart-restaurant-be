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
    @MessageBody() data: { restaurantId: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { restaurantId, role } = data;
    const room = `restaurant:${restaurantId}`;
    void client.join(room);

    // Also join role-specific rooms
    if (role) {
      void client.join(`${room}:${role}`);
    }

    this.logger.log(`Client ${client.id} joined room: ${room} as ${role}`);
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
    const room = `restaurant:${data.restaurantId}`;
    void client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { success: true };
  }

  /**
   * Notify new order to waiters
   */
  notifyNewOrder(restaurantId: string, orderData: Record<string, unknown>) {
    const room = `restaurant:${restaurantId}:waiter`;
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
    const room = `restaurant:${restaurantId}`;

    // Notify customers
    this.server.to(`${room}:customer`).emit('order-status-update', {
      type: 'order-item-status',
      status,
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });

    // Notify kitchen if accepted
    if (status === 'accepted') {
      this.server.to(`${room}:kitchen_staff`).emit('order-accepted', {
        type: 'order-accepted',
        data: orderItemData,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(
      `Order item ${status} notification sent for restaurant: ${restaurantId}`,
    );
  }

  /**
   * Notify kitchen when orders are sent
   */
  notifyKitchen(restaurantId: string, orderItems: Record<string, unknown>[]) {
    const room = `restaurant:${restaurantId}:kitchen_staff`;
    this.server.to(room).emit('orders-to-prepare', {
      type: 'orders-to-prepare',
      data: orderItems,
      timestamp: new Date().toISOString(),
      sound: true, // Trigger sound notification
    });
    this.logger.log(`Kitchen notification sent to room: ${room}`);
  }

  /**
   * Notify waiters when orders are ready
   */
  notifyOrderReady(
    restaurantId: string,
    orderItemData: Record<string, unknown>,
  ) {
    const room = `restaurant:${restaurantId}:waiter`;
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
    const room = `restaurant:${restaurantId}:customer`;
    this.server.to(room).emit('order-served', {
      type: 'order-served',
      data: orderItemData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Order served notification sent to room: ${room}`);
  }

  /**
   * Notify about bill creation
   */
  notifyBillCreated(restaurantId: string, billData: Record<string, unknown>) {
    const room = `restaurant:${restaurantId}`;
    this.server.to(room).emit('bill-created', {
      type: 'bill-created',
      data: billData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Bill created notification sent for restaurant: ${restaurantId}`,
    );
  }

  /**
   * Notify about payment completion
   */
  notifyPaymentCompleted(
    restaurantId: string,
    paymentData: Record<string, unknown>,
  ) {
    const room = `restaurant:${restaurantId}`;
    this.server.to(room).emit('payment-completed', {
      type: 'payment-completed',
      data: paymentData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Payment completed notification sent for restaurant: ${restaurantId}`,
    );
  }
}
