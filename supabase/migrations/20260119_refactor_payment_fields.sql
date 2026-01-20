-- Refactor payments table: rename provider_order_code and remove qr_code_url

-- Drop old index (correct PostgreSQL syntax)
DROP INDEX IF EXISTS public.idx_payments_provider_order_code;

-- Rename provider_order_code to stripe_session_id
ALTER TABLE public.payments
  RENAME COLUMN provider_order_code TO stripe_session_id;

-- Remove qr_code_url column (no longer needed for Stripe and Cash payments)
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS qr_code_url;

-- Create new index for stripe_session_id
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id
  ON public.payments (stripe_session_id);

-- Update comments
COMMENT ON COLUMN public.payments.stripe_session_id IS 'Stripe Checkout Session ID for reconciliation and webhooks';