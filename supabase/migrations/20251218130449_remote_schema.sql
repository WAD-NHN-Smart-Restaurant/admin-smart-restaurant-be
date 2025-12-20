-- =========================
-- ENUM: user_role
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    CREATE TYPE user_role AS ENUM (
      'super_admin',
      'admin',
      'waiter',
      'kitchen_staff',
      'customer',
      'guest'
    );
  END IF;
END$$;

-- =========================
-- TABLE: profiles
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role user_role DEFAULT 'customer',
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =========================
-- TABLE: tables
-- =========================
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number VARCHAR(50) NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 20),
  location VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'inactive')),
  qr_token VARCHAR(500),
  qr_token_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT tables_table_number_key UNIQUE (table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_status
  ON public.tables(status);

CREATE INDEX IF NOT EXISTS idx_tables_location
  ON public.tables(location);

-- =========================
-- TABLE: categories
-- =========================
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- =========================
-- TABLE: products
-- =========================
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- =========================
-- TABLE: modifiers
-- =========================
CREATE TABLE IF NOT EXISTS public.modifiers (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_multiple BOOLEAN DEFAULT false
);

-- =========================
-- TABLE: modifier_options
-- =========================
CREATE TABLE IF NOT EXISTS public.modifier_options (
  id SERIAL PRIMARY KEY,
  modifier_id INT REFERENCES public.modifiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0
);

-- =========================
-- TABLE: orders
-- =========================
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  table_id UUID REFERENCES public.tables(id),
  customer_id UUID REFERENCES public.profiles(id),
  total_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'payment_pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- =========================
-- TABLE: order_items
-- =========================
CREATE TABLE IF NOT EXISTS public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES public.products(id),
  quantity INT NOT NULL DEFAULT 1,
  price_at_time DECIMAL(10,2) NOT NULL,
  note TEXT,
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','preparing','ready','served')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- =========================
-- TABLE: order_item_options
-- =========================
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id SERIAL PRIMARY KEY,
  order_item_id INT REFERENCES public.order_items(id) ON DELETE CASCADE,
  modifier_option_id INT REFERENCES public.modifier_options(id),
  price_at_time DECIMAL(10,2) DEFAULT 0
);

-- =========================
-- TABLE: payments
-- =========================
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES public.orders(id),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50)
    CHECK (method IN ('cash','zalopay','momo','vnpay','stripe')),
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed')),
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- =========================
-- RLS + POLICY (safe)
-- =========================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public categories are viewable by everyone'
  ) THEN
    CREATE POLICY "Public categories are viewable by everyone"
    ON public.categories
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public products are viewable by everyone'
  ) THEN
    CREATE POLICY "Public products are viewable by everyone"
    ON public.products
    FOR SELECT USING (true);
  END IF;
END$$;