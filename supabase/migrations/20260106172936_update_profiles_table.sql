-- Add restaurant_id column with foreign key
ALTER TABLE public.profiles
ADD COLUMN restaurant_id uuid NULL REFERENCES public.restaurants (id) ON DELETE CASCADE;

-- Add check constraint: staff roles must have restaurant_id
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_staff_roles_require_restaurant_id
CHECK (
  role NOT IN ('admin', 'waiter', 'kitchen_staff') OR restaurant_id IS NOT NULL
);