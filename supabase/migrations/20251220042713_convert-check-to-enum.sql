BEGIN;

-- ===============================
-- 1. order_item_status
-- ===============================
CREATE TYPE order_item_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'served'
);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_status_check,
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.order_items
  ALTER COLUMN status
    TYPE order_item_status
    USING status::text::order_item_status,
  ALTER COLUMN status SET DEFAULT 'pending';

-- ===============================
-- 2. order_status
-- ===============================
CREATE TYPE order_status AS ENUM (
  'active',
  'payment_pending',
  'completed',
  'cancelled'
);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check,
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.orders
  ALTER COLUMN status
    TYPE order_status
    USING status::text::order_status,
  ALTER COLUMN status SET DEFAULT 'active';

-- ===============================
-- 3. payment_method
-- ===============================
CREATE TYPE payment_method AS ENUM (
  'cash',
  'zalopay',
  'momo',
  'vnpay',
  'stripe'
);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE public.payments
  ALTER COLUMN method
    TYPE payment_method
    USING method::text::payment_method;

-- ===============================
-- 4. payment_status
-- ===============================
CREATE TYPE payment_status AS ENUM (
  'pending',
  'success',
  'failed'
);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check,
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.payments
  ALTER COLUMN status
    TYPE payment_status
    USING status::text::payment_status,
  ALTER COLUMN status SET DEFAULT 'pending';

-- ===============================
-- 5. table_status
-- ===============================
CREATE TYPE table_status AS ENUM (
  'available',
  'occupied',
  'inactive'
);

ALTER TABLE public.tables
  DROP CONSTRAINT IF EXISTS tables_status_check,
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.tables
  ALTER COLUMN status
    TYPE table_status
    USING status::text::table_status,
  ALTER COLUMN status SET DEFAULT 'available';

COMMIT;