ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check,
  DROP CONSTRAINT IF EXISTS payments_status_check;

-- Rename product_id to menu_item_id in order_items table
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

ALTER TABLE public.order_items
  RENAME COLUMN product_id TO menu_item_id;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_menu_item_id_fkey
    FOREIGN KEY (menu_item_id)
    REFERENCES public.menu_items(id);

ALTER TABLE public.order_items
  ADD COLUMN status order_item_status DEFAULT 'pending' NOT NULL;

-- Create function to calculate menu item popularity
CREATE OR REPLACE FUNCTION calculate_menu_item_popularity(
  restaurant_id_param UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  menu_item_id UUID,
  popularity_score BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.menu_item_id,
    COALESCE(SUM(oi.quantity), 0)::BIGINT as popularity_score
  FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
  WHERE mi.restaurant_id = restaurant_id_param
    AND o.created_at >= (timezone('utc', now()) - INTERVAL '1 day' * days_back)
    AND o.status IN ('active', 'payment_pending', 'completed')
  GROUP BY oi.menu_item_id
  ORDER BY popularity_score DESC;
END;
$$;