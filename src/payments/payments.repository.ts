import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

export type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

type CreatePaymentParams = {
  orderId: string;
  amount?: number | null;
  paymentMethod?: string | null;
  status?: 'created' | 'pending' | 'success' | 'failed' | 'accepted';
  stripeSessionId?: string | null;
  checkoutUrl?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  discountRate?: number | null;
  discountAmount?: number | null;
};

type UpdatePaymentParams = Partial<
  Pick<
    PaymentRow,
    | 'status'
    | 'stripe_session_id'
    | 'checkout_url'
    | 'metadata'
    | 'currency'
    | 'amount'
    | 'payment_method'
    | 'discount_rate'
    | 'discount_amount'
  >
>;

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  async createPayment(params: CreatePaymentParams): Promise<PaymentRow> {
    const payload: PaymentInsert = {
      order_id: params.orderId,
      amount: params.amount ?? 0,
      payment_method: params.paymentMethod || null,
      status: params.status || 'created',
      stripe_session_id: params.stripeSessionId || null,
      checkout_url: params.checkoutUrl || null,
      currency: params.currency || null,
      metadata: (params.metadata ?? null) as PaymentInsert['metadata'],
      discount_rate: params.discountRate ?? 0,
      discount_amount: params.discountAmount ?? 0,
    };

    const { data, error } = await this.supabase
      .from('payments')
      .insert(payload)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async updatePayment(id: string, updates: UpdatePaymentParams) {
    // Filter out null values to avoid TypeScript issues with Supabase types
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== null),
    );

    const { data, error } = await this.supabase
      .from('payments')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw mapSqlError(error);
    return data;
  }

  async findByStripeSessionId(
    stripeSessionId: string,
  ): Promise<PaymentRow | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('stripe_session_id', stripeSessionId)
      .maybeSingle();

    if (error) throw mapSqlError(error);
    return data;
  }

  async findById(id: string): Promise<PaymentRow | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw mapSqlError(error);
    return data;
  }

  async findByOrderId(orderId: string): Promise<PaymentRow | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) throw mapSqlError(error);
    return data;
  }
}
