CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'waiter', 'kitchen_staff', 'customer', 'guest');

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role user_role DEFAULT 'customer',
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TABLE public.tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 20), 
    location VARCHAR(100), 
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    qr_token VARCHAR(500), 
    qr_token_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT tables_table_number_key UNIQUE (table_number)
);

CREATE INDEX idx_tables_status ON public.tables(status);
CREATE INDEX idx_tables_location ON public.tables(location);

CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE public.products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES public.categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.modifiers (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_multiple BOOLEAN DEFAULT false
);

CREATE TABLE public.modifier_options (
    id SERIAL PRIMARY KEY,
    modifier_id INT REFERENCES public.modifiers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0 
);


CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    table_id UUID REFERENCES public.tables(id),
    customer_id UUID REFERENCES public.profiles(id), 
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'payment_pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES public.products(id),
    quantity INT NOT NULL DEFAULT 1,
    price_at_time DECIMAL(10, 2) NOT NULL, 
    note TEXT, 
    
    status VARCHAR(50) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'served')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) 
);

CREATE TABLE public.order_item_options (
    id SERIAL PRIMARY KEY,
    order_item_id INT REFERENCES public.order_items(id) ON DELETE CASCADE,
    modifier_option_id INT REFERENCES public.modifier_options(id),
    price_at_time DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE public.payments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES public.orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(50) CHECK (method IN ('cash', 'zalopay', 'momo', 'vnpay', 'stripe')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bật RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách: Ai cũng được xem (Select) danh mục và món ăn
CREATE POLICY "Public categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Public products are viewable by everyone" 
ON public.products FOR SELECT USING (true);