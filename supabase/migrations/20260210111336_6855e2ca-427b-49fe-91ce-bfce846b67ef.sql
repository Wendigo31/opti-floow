-- Add stops (intermediate addresses) and line references to planning_entries
ALTER TABLE public.planning_entries 
  ADD COLUMN IF NOT EXISTS stops jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS line_reference text,
  ADD COLUMN IF NOT EXISTS return_line_reference text;