/**
 * Stripe Service
 */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  StripeCreateCheckoutSessionParams,
  StripeCheckoutResponse,
  STRIPE_EVENT_TYPES,
} from './stripe.types';

@Injectable()
export class StripeService {
  private stripe!: Stripe;
  private logger = new Logger('StripeService');
  private stripeSecretKey: string;
  private stripeWebhookSecret: string;

  constructor() {
    this.stripeSecretKey =
      process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    this.stripeWebhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

    // Initialize Stripe with default API version to use SDK's latest types
    this.stripe = new Stripe(this.stripeSecretKey);
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(
    params: StripeCreateCheckoutSessionParams,
  ): Promise<StripeCheckoutResponse> {
    try {
      if (!params.amount || params.amount <= 0) {
        throw new BadRequestException('Invalid payment amount');
      }

      if (!params.orderCode) {
        throw new BadRequestException('Order code is required');
      }

      const session = (await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Order Payment - ${params.orderCode}`,
                description: 'Smart Restaurant Order Payment',
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          orderCode: params.orderCode,
        },
      })) as Stripe.Checkout.Session;

      if (!session.url) {
        throw new Error('Failed to generate checkout URL');
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        amount: params.amount,
        orderCode: params.orderCode,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error);
      throw new BadRequestException(
        `Failed to create Stripe checkout session: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Construct webhook event from raw request body and signature
   */
  constructWebhookEvent(
    body: Buffer | string,
    signature: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.stripeWebhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle Stripe webhook events
   */
  handleWebhookEvent(event: Stripe.Event): {
    eventType: string;
    isPaymentSuccess: boolean;
    orderCode?: string;
    amount?: number;
    sessionId?: string;
  } {
    const eventType = event.type as string;

    switch (eventType) {
      case STRIPE_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED: {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          eventType,
          isPaymentSuccess: session.payment_status === 'paid',
          orderCode: session.metadata?.orderCode,
          amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents to dollars
          sessionId: session.id,
        };
      }

      case STRIPE_EVENT_TYPES.PAYMENT_INTENT_SUCCEEDED: {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        return {
          eventType,
          isPaymentSuccess: true,
          orderCode: paymentIntent.metadata?.orderCode,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
        };
      }

      case STRIPE_EVENT_TYPES.PAYMENT_INTENT_PAYMENT_FAILED: {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        return {
          eventType,
          isPaymentSuccess: false,
          orderCode: failedIntent.metadata?.orderCode,
          amount: failedIntent.amount / 100,
        };
      }

      default:
        return {
          eventType,
          isPaymentSuccess: false,
        };
    }
  }

  /**
   * Get Stripe session details
   */
  async getSessionDetails(
    sessionId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.error(`Failed to retrieve session ${sessionId}`, error);
      return null;
    }
  }
}
