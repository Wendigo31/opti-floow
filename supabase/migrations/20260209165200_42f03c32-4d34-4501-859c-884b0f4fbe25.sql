-- Add display_name to search_history for tracking who did the search
ALTER TABLE public.search_history ADD COLUMN IF NOT EXISTS display_name text;
