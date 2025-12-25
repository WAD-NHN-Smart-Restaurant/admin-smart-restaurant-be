ALTER TABLE public.menu_item_photos ADD COLUMN storage_key TEXT;
UPDATE public.menu_item_photos SET storage_key = url; -- Fallback for existing data if any
