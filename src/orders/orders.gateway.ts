import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.GUEST_CUSTOMER_FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Guest joins a table room to receive order updates
   */
  @SubscribeMessage('join_table')
  handleJoinTable(
    @MessageBody() data: { table_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { table_id } = data;
    void client.join(`table_${table_id}`);
    this.logger.log(`Client ${client.id} joined table_${table_id}`);
    return { success: true, message: `Joined table ${table_id}` };
  }

  /**
   * Emit order status update to specific table
   */
  emitOrderStatusUpdate(tableId: string, orderId: string, status: string) {
    this.server.to(`table_${tableId}`).emit('order_status_updated', {
      order_id: orderId,
      status,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted order_status_updated to table_${tableId}: ${orderId} -> ${status}`,
    );
  }

  /**
   * Emit order item status update to specific table
   */
  emitOrderItemStatusUpdate(
    tableId: string,
    orderItemId: string,
    status: string,
    rejectedReason?: string,
  ) {
    this.server.to(`table_${tableId}`).emit('order_item_updated', {
      order_item_id: orderItemId,
      status,
      rejected_reason: rejectedReason,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted order_item_updated to table_${tableId}: ${orderItemId} -> ${status}`,
    );
  }

  /**
   * Emit new order notification to all waiters/kitchen
   */
  emitNewOrderNotification(orderId: string, restaurantId: string) {
    this.server.to(`restaurant_${restaurantId}`).emit('new_order', {
      order_id: orderId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Emitted new_order to restaurant_${restaurantId}`);
  }

  /**
   * Emit bill request to waiters
   */
  emitBillRequest(tableId: string, orderId: string, restaurantId: string) {
    this.server.to(`restaurant_${restaurantId}`).emit('bill_requested', {
      order_id: orderId,
      table_id: tableId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted bill_requested from table_${tableId} to restaurant_${restaurantId}`,
    );
  }

  /**
   * Emit call waiter request
   */
  emitCallWaiter(tableId: string, restaurantId: string) {
    this.server.to(`restaurant_${restaurantId}`).emit('waiter_called', {
      table_id: tableId,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Emitted waiter_called from table_${tableId} to restaurant_${restaurantId}`,
    );
  }
}
