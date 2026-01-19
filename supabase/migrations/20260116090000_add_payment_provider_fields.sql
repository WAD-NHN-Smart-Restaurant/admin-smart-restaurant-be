-- Add support for payOS payments and provider metadata
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payos';
  END IF;
END $$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_order_code text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS currency text;

-- Keep updated_at in sync for auditing
ALTER TABLE public.payments
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS idx_payments_provider_order_code
  ON public.payments (provider_order_code);

COMMENT ON COLUMN public.payments.provider_order_code IS 'Order code/reference returned by external payment provider (e.g., payOS)';
COMMENT ON COLUMN public.payments.checkout_url IS 'Payment page URL for redirecting users';
COMMENT ON COLUMN public.payments.qr_code_url IS 'QR code URL for scanning payments (e.g., payOS)';
COMMENT ON COLUMN public.payments.metadata IS 'Raw provider payload for reconciliation/debugging';
COMMENT ON COLUMN public.payments.currency IS 'Currency code used for the payment (defaults to VND when using payOS)';
