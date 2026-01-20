-- Add is_active column to profiles table for staff management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.profiles.is_active IS 'Indicates whether the staff account is active. Used for soft-deactivating staff accounts.';

-- Create index for better query performance when filtering by is_active
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Create index for filtering by role and restaurant_id (for staff listing)
CREATE INDEX IF NOT EXISTS idx_profiles_role_restaurant ON public.profiles(role, restaurant_id) WHERE role IN ('admin', 'waiter', 'kitchen_staff');
