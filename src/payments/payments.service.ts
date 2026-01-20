import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { OrdersRepository } from '../orders/orders.repository';
import { OrdersGateway } from '../gateways/orders.gateway';
import { PaymentsRepository, PaymentRow } from './payments.repository';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { StripeService } from './stripe/stripe.service';
import { Database, Json } from '../supabase/supabase.types';

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
   * Create initial payment record when customer requests bill
   * This creates a payment with only order_id, status is 'created' (waiting for waiter to accept and apply discount)
   */
  async createInitialPaymentRecord(orderId: string): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.createPayment({
      orderId,
      status: 'created',
    });

    this.logger.log(
      `Initial payment record created: ${payment.id} for order: ${orderId}`,
    );
    return payment;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }
    return payment;
  }

  /**
   * Accept payment request and apply discount (called by waiter/admin)
   * Calculates discount_amount from order total and discount_rate
   * Updates status to 'accepted'
   */
  async acceptPaymentWithDiscount(
    paymentId: string,
    discountRate: number,
    discountAmount: number,
  ): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'created') {
      throw new BadRequestException('Payment is not in created status');
    }

    // Always get order to calculate from order total
    const order = await this.ordersRepository.getOrderById(payment.order_id);
    if (!order) {
      throw new NotFoundException('Order not found for this payment');
    }

    // Calculate order total (subtotal of all items + options)
    const orderTotal = this.calculateOrderTotal(order as OrderRow);

    // Calculate discount_amount based on discountRate
    // If discountAmount is provided, use it; otherwise calculate from rate
    let effectiveDiscountAmount = discountAmount;
    if (!effectiveDiscountAmount || effectiveDiscountAmount === 0) {
      effectiveDiscountAmount =
        Math.round(orderTotal * (discountRate / 100) * 100) / 100;
    }

    this.logger.log(
      `Accepting payment ${paymentId}:`,
      `Order total: $${orderTotal}`,
      `Discount: ${discountRate}% = $${effectiveDiscountAmount}`,
    );

    // Update payment to accepted with discount values
    const updatedPayment = await this.paymentsRepository.updatePayment(
      paymentId,
      {
        status: 'accepted',
        discount_rate: discountRate,
        discount_amount: effectiveDiscountAmount,
      },
    );

    this.logger.log(
      `Payment ${paymentId} accepted with discount: ${discountRate}% / $${effectiveDiscountAmount}`,
    );

    return updatedPayment;
  }

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
   * Updates existing payment from 'accepted' to 'pending'
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

    // Find existing payment for this order
    let payment = await this.paymentsRepository.findByOrderId(order.id);

    if (!payment) {
      // If no payment exists, create new one (fallback for old flow)
      payment = await this.paymentsRepository.createPayment({
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
    } else {
      // Update existing payment to pending with payment details
      payment = await this.paymentsRepository.updatePayment(payment.id, {
        amount: paymentAmount,
        payment_method: 'cash',
        status: 'pending',
        currency: '$',
        metadata: {
          note: 'Customer will pay at counter - waiting for waiter confirmation',
          orderTotal,
          subtotalAfterDiscount: orderTotal - discountAmount,
          discountAmount: payment.discount_amount || discountAmount,
          tax: (orderTotal - (payment.discount_amount || discountAmount)) * 0.1,
          tipAmount,
        } as Json,
      });
    }

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
   * Updates existing payment from 'accepted' to 'pending' with Stripe details
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

    // Find existing payment for this order
    let payment = await this.paymentsRepository.findByOrderId(order.id);

    if (!payment) {
      // If no payment exists, create new one (fallback for old flow)
      payment = await this.paymentsRepository.createPayment({
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
    } else {
      // Update existing payment to pending with Stripe details
      payment = await this.paymentsRepository.updatePayment(payment.id, {
        amount: paymentAmount,
        payment_method: 'stripe',
        status: 'pending',
        stripe_session_id: orderCode,
        currency: '$',
        metadata: {
          orderTotal,
          subtotalAfterDiscount:
            orderTotal - (payment.discount_amount || discountAmount),
          discountAmount: payment.discount_amount || discountAmount,
          tax: (orderTotal - (payment.discount_amount || discountAmount)) * 0.1,
          tipAmount,
        } as Json,
      });
    }

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
   * Confirm payment status (Guest)
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

    const finalValues = this.buildFinalPaymentUpdate(
      payment,
      order as OrderRow,
    );

    const updatedPayment = await this.paymentsRepository.updatePayment(
      payment.id,
      {
        status,
        amount: finalValues.amount,
        currency: finalValues.currency,
        payment_method: finalValues.paymentMethod || payment.payment_method,
        discount_amount: finalValues.discountAmount,
        discount_rate: finalValues.discountRate,
        metadata: {
          ...(finalValues.metadata as Record<string, unknown>),
          confirmedAt: new Date().toISOString(),
          confirmationSource: 'guest',
        } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      },
    );

    if (status === 'success') {
      await this.markOrderCompleted(order.id, tableId);
    }

    this.logger.log(`Payment ${status}: ${paymentId} - Order: ${order.id}`);

    return updatedPayment;
  }

  /**
   * Confirm payment by Admin/Waiter (no tableId verification needed)
   * Updates payment status to 'success' and order status to 'completed'
   */
  async confirmPaymentByAdmin(paymentId: string): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'accepted' && payment.status !== 'pending') {
      throw new BadRequestException(
        'Payment must be in accepted or pending status',
      );
    }

    const order = await this.ordersRepository.getOrderById(payment.order_id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Build final payment values
    const finalValues = this.buildFinalPaymentUpdate(
      payment,
      order as OrderRow,
    );

    // Update payment to success
    const updatedPayment = await this.paymentsRepository.updatePayment(
      payment.id,
      {
        status: 'success',
        amount: finalValues.amount,
        currency: finalValues.currency,
        payment_method: finalValues.paymentMethod || payment.payment_method,
        discount_amount: finalValues.discountAmount,
        discount_rate: finalValues.discountRate,
        metadata: {
          ...(finalValues.metadata as Record<string, unknown>),
          confirmedAt: new Date().toISOString(),
          confirmationSource: 'admin',
        } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
      },
    );

    // Update order to completed
    await this.ordersRepository.updateOrderStatus(order.id, 'completed');

    // Emit socket event
    const orderWithTable = await this.ordersRepository.getOrderWithTable(
      order.id,
    );
    if (orderWithTable && order.table_id) {
      const restaurantId = orderWithTable.tables.restaurant_id;
      this.ordersGateway.emitOrderStatusUpdate(
        restaurantId,
        order.table_id,
        order.id,
        'completed',
      );
    }

    this.logger.log(
      `Payment confirmed by admin: ${paymentId} - Order: ${order.id} marked as completed`,
    );

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
            // Complete order and sync final payment info
            const order = await this.ordersRepository.getOrderById(
              payment.order_id,
            );
            if (order) {
              const finalValues = this.buildFinalPaymentUpdate(
                payment,
                order as OrderRow,
              );

              await this.paymentsRepository.updatePayment(payment.id, {
                status: 'success',
                amount: finalValues.amount,
                currency: finalValues.currency,
                payment_method:
                  finalValues.paymentMethod || payment.payment_method,
                discount_amount: finalValues.discountAmount,
                discount_rate: finalValues.discountRate,
                metadata: {
                  ...(finalValues.metadata as Record<string, unknown>),
                  stripeSessionId: parsed.sessionId,
                  stripeEventType: eventType,
                  webhookProcessedAt: new Date().toISOString(),
                } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
              });

              await this.ordersRepository.updateOrderStatus(
                order.id,
                'completed',
              );
            } else {
              // Fallback: still mark payment as successful with Stripe metadata
              await this.paymentsRepository.updatePayment(payment.id, {
                status: 'success',
                metadata: {
                  ...(typeof payment.metadata === 'object' &&
                  payment.metadata !== null
                    ? (payment.metadata as Record<string, unknown>)
                    : {}),
                  stripeSessionId: parsed.sessionId,
                  stripeEventType: eventType,
                  webhookProcessedAt: new Date().toISOString(),
                } as unknown as Database['public']['Tables']['payments']['Update']['metadata'],
              });
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
   * Consolidate final payment data (amount, discount, metadata)
   */
  private buildFinalPaymentUpdate(payment: PaymentRow, order: OrderRow) {
    const baseMetadata =
      typeof payment.metadata === 'object' && payment.metadata !== null
        ? (payment.metadata as Record<string, unknown>)
        : {};

    const orderTotal = this.calculateOrderTotal(order);
    const discountRate =
      payment.discount_rate ??
      (typeof baseMetadata.discountRate === 'number'
        ? baseMetadata.discountRate
        : Number(baseMetadata.discountRate) || 0);

    const rawDiscountAmount =
      payment.discount_amount ??
      (typeof baseMetadata.discountAmount === 'number'
        ? baseMetadata.discountAmount
        : Number(baseMetadata.discountAmount) || 0);

    const discountAmount =
      rawDiscountAmount && rawDiscountAmount > 0
        ? rawDiscountAmount
        : Math.round(orderTotal * (discountRate / 100) * 100) / 100;

    const tipAmount =
      typeof baseMetadata.tipAmount === 'number'
        ? baseMetadata.tipAmount
        : Number(baseMetadata.tipAmount) || 0;

    const amount = this.calculatePaymentAmount(
      orderTotal,
      tipAmount,
      discountAmount,
    );

    const currency = payment.currency || '$';
    const paymentMethod = payment.payment_method || null;
    const tax =
      Math.round(Math.max(0, orderTotal - discountAmount) * 0.1 * 100) / 100;

    return {
      amount,
      currency,
      paymentMethod,
      discountAmount,
      discountRate,
      metadata: {
        ...baseMetadata,
        orderTotal,
        subtotalAfterDiscount: Math.max(0, orderTotal - discountAmount),
        discountAmount,
        discountRate,
        tax,
        tipAmount,
      } as Json,
    };
  }

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
