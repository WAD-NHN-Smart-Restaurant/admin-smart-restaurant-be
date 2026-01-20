ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5, 2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.payments.discount_rate IS 'Discount percentage (0-100)';
COMMENT ON COLUMN public.payments.discount_amount IS 'Fixed discount amount in currency units';

ALTER TABLE public.payments
ADD CONSTRAINT chk_discount_rate
CHECK (discount_rate >= 0 AND discount_rate <= 100);

CREATE INDEX IF NOT EXISTS idx_payments_discount_rate
ON public.payments(discount_rate)
WHERE discount_rate > 0;
