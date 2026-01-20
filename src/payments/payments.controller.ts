import {
  Body,
  Controller,
  Param,
  Post,
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
