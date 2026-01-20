-- Add guest_name and special_request columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS special_request text;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.guest_name IS 'Optional guest name for staff identification';
COMMENT ON COLUMN public.orders.special_request IS 'Special instructions for kitchen from the guest';
