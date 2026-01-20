/**
 * Stripe Types & Interfaces
 */

export interface StripeCreateCheckoutSessionParams {
  amount: number; // Amount in USD
  orderCode: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  amount: number;
  orderCode: string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      payment_status: string;
      amount_total: number;
      metadata?: {
        orderCode?: string;
      };
    };
  };
}

export const STRIPE_EVENT_TYPES = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
};
