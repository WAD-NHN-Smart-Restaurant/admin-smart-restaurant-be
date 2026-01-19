import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';

export type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

type CreatePaymentParams = {
  orderId: string;
  amount: number;
  paymentMethod: string;
  status?: Database['public']['Enums']['payment_status'];
  stripeSessionId?: string | null;
  checkoutUrl?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
};

type UpdatePaymentParams = Partial<
  Pick<
    PaymentRow,
    'status' | 'stripe_session_id' | 'checkout_url' | 'metadata' | 'currency'
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
      amount: params.amount,
      payment_method: params.paymentMethod,
      status: params.status || 'pending',
      stripe_session_id: params.stripeSessionId || null,
      checkout_url: params.checkoutUrl || null,
      currency: params.currency || null,
      metadata: (params.metadata as PaymentInsert['metadata']) || null,
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
    const { data, error } = await this.supabase
      .from('payments')
      .update({
        ...updates,
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
}
