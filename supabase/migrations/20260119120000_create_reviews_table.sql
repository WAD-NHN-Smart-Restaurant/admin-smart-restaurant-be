-- =========================
-- TABLE: reviews
-- =========================
-- Reviews table for customers to rate and review menu items they have ordered
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  
  -- Ensure a customer can only review an item once per order
  CONSTRAINT unique_customer_item_order UNIQUE (customer_id, menu_item_id, order_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_menu_item_id ON public.reviews(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- RLS policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Customers can view all reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Customers can only insert their own reviews
CREATE POLICY "Customers can insert their own reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can only update their own reviews
CREATE POLICY "Customers can update their own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = customer_id);

-- Customers can only delete their own reviews
CREATE POLICY "Customers can delete their own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = customer_id);
