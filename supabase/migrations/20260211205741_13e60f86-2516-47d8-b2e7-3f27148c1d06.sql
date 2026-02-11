
-- Add multi-vehicle support columns to saved_tours
ALTER TABLE public.saved_tours
  ADD COLUMN IF NOT EXISTS vehicle_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS vehicles_data jsonb DEFAULT '[]'::jsonb;
