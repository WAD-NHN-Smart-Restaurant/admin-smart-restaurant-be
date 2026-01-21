import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Request,
  UseGuards,
  Req,
  Logger,
  Headers,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AcceptPaymentDto } from './dto/accept-payment.dto';
import { StripeService } from './stripe/stripe.service';
import type { Request as ExpressRequest } from 'express';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger('PaymentsController');

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Guest: initiate payment (cash, VNPay, or Stripe)
   */
  @Post('guest')
  @UseGuards(QrTokenGuard)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @Request()
    req: ExpressRequest & {
      qrToken: { tableId: string; restaurantId: string };
    },
  ) {
    const { tableId, restaurantId } = req.qrToken;
    const result = await this.paymentsService.initiatePayment(
      tableId,
      restaurantId,
      dto,
    );

    return {
      status: true,
      data: result,
    };
  }

  /**
   * Guest: get payment status by payment ID
   */
  @Get('guest/:paymentId')
  @UseGuards(QrTokenGuard)
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    const result = await this.paymentsService.getPaymentStatus(paymentId);

    return {
      status: true,
      data: result,
    };
  }

  /**
   * Guest: get payment by order ID
   */
  @Get('guest/order/:orderId')
  @UseGuards(QrTokenGuard)
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    const result = await this.paymentsService.getPaymentByOrderId(orderId);

    return {
      status: true,
      data: result,
    };
  }

  /**
   * Guest: confirm payment (for cash or after online payment)
   */
  @Post('guest/:paymentId/confirm')
  @UseGuards(QrTokenGuard)
  async confirmPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: ConfirmPaymentDto,
    @Request() req: ExpressRequest & { qrToken: { tableId: string } },
  ) {
    const { tableId } = req.qrToken;
    const result = await this.paymentsService.confirmPayment(
      paymentId,
      tableId,
      body.status,
    );

    return {
      status: true,
      data: result,
      message: 'Payment status updated',
    };
  }

  /**
   * Admin/Waiter: Get completed payments with metadata (customer payments)
   */
  @Get('admin/completed')
  async getCompletedPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.paymentsService.getCompletedPayments(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );

    return {
      status: true,
      data: result,
    };
  }

  /**
   * Admin/Waiter: Get pending payment requests (status='created')
   */
  @Get('admin/pending')
  async getPendingPayments() {
    const result = await this.paymentsService.getPendingPayments();

    return {
      status: true,
      data: result,
    };
  }

  /**
   * Test endpoint to verify DTO validation
   */
  @Post('admin/test-dto')
  async testDto(@Body() body: AcceptPaymentDto) {
    this.logger.log(`Test DTO received: ${JSON.stringify(body)}`);
    return {
      status: true,
      message: 'DTO test passed',
      received: body,
    };
  }

  /**
   * Admin/Waiter: Accept payment request and apply discount
   */
  @Post('admin/:paymentId/accept')
  async acceptPaymentWithDiscount(
    @Param('paymentId') paymentId: string,
    @Body() body: any,
  ) {
    this.logger.debug(`Raw body received: ${JSON.stringify(body)}`);
    this.logger.debug(
      `Body type: ${typeof body}, keys: ${Object.keys(body || {})}`,
    );
    // Handle both camelCase (from frontend) and snake_case (after interceptor)
    const discountRate = body?.discount_rate ?? body?.discountRate ?? 0;
    const discountAmount = body?.discount_amount ?? body?.discountAmount ?? 0;

    this.logger.log(
      `Accept payment - ID: ${paymentId}, discountRate: ${discountRate}, discountAmount: ${discountAmount}`,
    );

    if (!discountRate && !discountAmount) {
      this.logger.warn(`No discount values provided for payment ${paymentId}`);
    }

    const result = await this.paymentsService.acceptPaymentWithDiscount(
      paymentId,
      Number(discountRate) || 0,
      Number(discountAmount) || 0,
    );

    return {
      status: true,
      data: result,
      message: 'Payment accepted and discount applied',
    };
  }

  /**
   * Admin/Waiter: Confirm payment (mark as success and complete order)
   */
  @Post('admin/:paymentId/confirm')
  async confirmPaymentByAdmin(@Param('paymentId') paymentId: string) {
    const result = await this.paymentsService.confirmPaymentByAdmin(paymentId);

    return {
      status: true,
      data: result,
      message: 'Payment confirmed successfully',
    };
  }

  /**
   * Stripe webhook handler
   */
  @Post('webhook/stripe')
  async stripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const body = (req as unknown as { rawBody?: Buffer | string }).rawBody;

    try {
      if (!signature || !body) {
        throw new Error('Missing Stripe signature or raw body');
      }

      const parsed: {
        eventType: string;
        isPaymentSuccess: boolean;
        orderCode?: string;
        amount?: number;
        sessionId?: string;
      } = this.stripeService.handleWebhookEvent(
        this.stripeService.constructWebhookEvent(body, signature),
      );

      const result =
        await this.paymentsService.handleStripeWebhookResult(parsed);

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Stripe webhook error', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Stripe webhook error',
      };
    }
  }
}
