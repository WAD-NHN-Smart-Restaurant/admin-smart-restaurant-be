-- Add avatar fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS storage_key TEXT;

-- Add comment to describe the columns
COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL for user avatar image';
COMMENT ON COLUMN public.profiles.storage_key IS 'Storage key for managing avatar in object storage (Cloudflare R2)';
