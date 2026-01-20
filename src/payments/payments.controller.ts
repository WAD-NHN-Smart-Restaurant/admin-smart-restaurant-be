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
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
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
    req: ExpressRequest & { user: { tableId: string; restaurantId: string } },
  ) {
    const { tableId, restaurantId } = req.user;
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
    @Request() req: ExpressRequest & { user: { tableId: string } },
  ) {
    const { tableId } = req.user;
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
   * Admin/Waiter: Accept payment request and apply discount
   */
  @Post('admin/:paymentId/accept')
  async acceptPaymentWithDiscount(
    @Param('paymentId') paymentId: string,
    @Body() body: { discountRate?: number; discountAmount?: number },
  ) {
    const result = await this.paymentsService.acceptPaymentWithDiscount(
      paymentId,
      body.discountRate || 0,
      body.discountAmount || 0,
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
    const result =
      await this.paymentsService.confirmPaymentByAdmin(paymentId);

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
