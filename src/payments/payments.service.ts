import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OrdersRepository } from '../orders/orders.repository';
import { PaymentsRepository } from './payments.repository';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { StripeService } from './stripe/stripe.service';
import { Database } from '../supabase/supabase.types';
import { OrdersGateway } from 'src/gateways/orders.gateway';

// Table/Order type aliases
type OrderItemOptionRow =
  Database['public']['Tables']['order_item_options']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'] & {
  order_item_options?: OrderItemOptionRow[];
};
type OrderRow = Database['public']['Tables']['orders']['Row'] & {
  order_items?: OrderItemRow[];
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersGateway: OrdersGateway,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Initiate payment based on method
   */
  async initiatePayment(
    tableId: string,
    restaurantId: string,
    dto: InitiatePaymentDto,
  ) {
    if (dto.method === 'cash') {
      return this.payAtCounter(
        tableId,
        dto.tipAmount || 0,
        Number(dto.discountAmount) || 0,
      );
    }

    if (dto.method === 'stripe') {
      return this.createStripePayment(
        tableId,
        dto.returnUrl,
        dto.tipAmount || 0,
        Number(dto.discountAmount) || 0,
      );
    }

    throw new BadRequestException('Unsupported payment method');
  }

  /**
   * Pay at counter (cash payment)
   */
  async payAtCounter(
    tableId: string,
    tipAmount: number = 0,
    discountAmount: number = 0,
  ) {
    const order = await this.getPayableOrder(tableId);
    const orderTotal = this.calculateOrderTotal(order);
    const paymentAmount = this.calculatePaymentAmount(
      orderTotal,
      tipAmount,
      discountAmount,
    );

    // Update order total
    await this.ordersRepository.updateOrderTotal(order.id, orderTotal);

    // Create payment record
    const payment = await this.paymentsRepository.createPayment({
      orderId: order.id,
      amount: paymentAmount,
      paymentMethod: 'cash',
      status: 'pending',
      currency: '$',
      metadata: {
        note: 'Customer will pay at counter - waiting for waiter confirmation',
        orderTotal,
        subtotalAfterDiscount: orderTotal - discountAmount,
        discountAmount,
        tax: (orderTotal - discountAmount) * 0.1,
        tipAmount,
      } as Record<string, unknown>,
    });

    this.logger.log(
      `Cash payment initiated: ${payment.id} - $${paymentAmount}`,
    );

    return {
      payment,
      orderStatus: 'payment_pending',
      totalAmount: paymentAmount,
      message: 'Please proceed to counter for payment',
    };
  }

  /**
   * Create Stripe payment
   */
  async createStripePayment(
    tableId: string,
    returnUrl?: string,
    tipAmount: number = 0,
    discountAmount: number = 0,
  ) {
    const order = await this.getPayableOrder(tableId);
    const orderTotal = this.calculateOrderTotal(order);
    const paymentAmount = this.calculatePaymentAmount(
      orderTotal,
      tipAmount,
      discountAmount,
    );

    // Update order total
    await this.ordersRepository.updateOrderTotal(order.id, orderTotal);

    // Generate order code
    const orderCode = this.generateOrderCode();

    // Create payment record
    const payment = await this.paymentsRepository.createPayment({
      orderId: order.id,
      amount: paymentAmount,
      paymentMethod: 'stripe',
      status: 'pending',
      stripeSessionId: orderCode,
      currency: '$',
      metadata: {
        orderTotal,
        subtotalAfterDiscount: orderTotal - discountAmount,
        discountAmount,
        tax: (orderTotal - discountAmount) * 0.1,
        tipAmount,
      } as Record<string, unknown>,
    });

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const baseReturnUrl =
        returnUrl || `${frontendUrl}/payment?paid=1&method=stripe`;
      const separator = baseReturnUrl.includes('?') ? '&' : '?';

      const successUrl =
        `${baseReturnUrl}${separator}` +
        `paymentId=${payment.id}` +
        `&stripeSessionId=${orderCode}` +
        `&sessionId={CHECKOUT_SESSION_ID}`;

      const cancelUrl = `${frontendUrl}/payment?cancelled=1`;

      // Create Stripe checkout session
      const stripeResponse = await this.stripeService.createCheckoutSession({
        amount: paymentAmount,
        orderCode,
        successUrl,
        cancelUrl,
      });

      // Update payment with checkout URL and session ID
      const updatedPayment = await this.paymentsRepository.updatePayment(
        payment.id,
        {
          checkout_url: stripeResponse.checkoutUrl,
          metadata: {
            ...(typeof payment.metadata === 'object' &&
            payment.metadata !== null
              ? (payment.metadata as Record<string, any>)
              : {}),
            stripeSessionId: stripeResponse.sessionId,
            stripeOrderCode: stripeResponse.orderCode,
          } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
        },
      );

      this.logger.log(
        `Stripe payment created: ${payment.id} - Session: ${stripeResponse.sessionId} - $${paymentAmount}`,
      );

      return {
        payment: updatedPayment,
        status: 'pending',
        checkoutUrl: stripeResponse.checkoutUrl,
        sessionId: stripeResponse.sessionId,
        amount: stripeResponse.amount,
        orderCode: stripeResponse.orderCode,
      };
    } catch (error) {
      // Mark payment as failed
      await this.paymentsRepository.updatePayment(payment.id, {
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Stripe error',
        } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      });

      throw error;
    }
  }

  /**
   * Confirm payment status
   */
  async confirmPayment(
    paymentId: string,
    tableId: string,
    status: ConfirmPaymentDto['status'],
  ) {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const order = await this.ordersRepository.getOrderById(payment.order_id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.table_id !== tableId) {
      throw new BadRequestException('Payment does not belong to this table');
    }

    const updatedPayment = await this.paymentsRepository.updatePayment(
      payment.id,
      {
        status,
      },
    );

    if (status === 'success') {
      await this.markOrderCompleted(order.id, tableId);
    }

    this.logger.log(`Payment ${status}: ${paymentId} - Order: ${order.id}`);

    return updatedPayment;
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhookResult(parsed: {
    eventType: string;
    isPaymentSuccess: boolean;
    orderCode?: string;
    amount?: number;
    sessionId?: string;
  }) {
    try {
      const eventType = parsed.eventType;

      if (
        eventType === 'checkout.session.completed' &&
        parsed.isPaymentSuccess
      ) {
        const orderCode = parsed.orderCode;

        if (orderCode) {
          // Find payment by stripe session id
          const payment =
            await this.paymentsRepository.findByStripeSessionId(orderCode);

          if (payment) {
            // Update payment status
            await this.paymentsRepository.updatePayment(payment.id, {
              status: 'success',
              metadata: {
                ...(typeof payment.metadata === 'object' &&
                payment.metadata !== null
                  ? (payment.metadata as Record<string, any>)
                  : {}),
                stripeSessionId: parsed.sessionId,
              } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
            });

            // Complete order
            const order = await this.ordersRepository.getOrderById(
              payment.order_id,
            );
            if (order) {
              await this.ordersRepository.updateOrderStatus(
                order.id,
                'completed',
              );
            }

            this.logger.log(`Stripe webhook processed: Payment ${payment.id}`);
            return { success: true };
          }
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling Stripe webhook', error);
      throw error;
    }
  }

  // ============= HELPER METHODS =============

  /**
   * Get payable order for table
   */
  private async getPayableOrder(tableId: string): Promise<OrderRow> {
    const order = await this.ordersRepository.getActiveOrderByTable(tableId);

    if (!order) {
      throw new NotFoundException('No active order found for this table');
    }

    if (!order.order_items || order.order_items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    return order;
  }

  /**
   * Calculate order total from items
   */
  private calculateOrderTotal(order: OrderRow): number {
    if (!order.order_items || order.order_items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const items = order.order_items ?? [];
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
   * Calculate final payment amount including tax, tip, and discount
   */
  private calculatePaymentAmount(
    orderTotal: number,
    tipAmount: number = 0,
    discountAmount: number = 0,
  ): number {
    const subtotalAfterDiscount = Math.max(0, orderTotal - discountAmount); // Prevent negative
    const tax = subtotalAfterDiscount * 0.1; // 10% tax
    return Math.round((subtotalAfterDiscount + tax + tipAmount) * 100) / 100;
  }

  /**
   * Generate unique order code
   */
  private generateOrderCode(): string {
    const timestamp = Date.now().toString();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomChars = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    return `${timestamp.slice(-8)}${randomChars}`;
  }

  /**
   * Mark order as completed
   */
  private async markOrderCompleted(
    orderId: string,
    tableId: string,
  ): Promise<void> {
    await this.ordersRepository.updateOrderStatus(orderId, 'completed');
    const order = await this.ordersRepository.getOrderWithTable(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const restaurantId = order.tables.restaurant_id;
    this.ordersGateway.emitOrderStatusUpdate(
      restaurantId,
      tableId,
      orderId,
      'completed',
    );
  }
}
