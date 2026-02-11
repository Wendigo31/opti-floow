
-- Add saved_tour_id to planning_entries to link tractions to saved tours
ALTER TABLE public.planning_entries 
  ADD COLUMN IF NOT EXISTS saved_tour_id uuid REFERENCES public.saved_tours(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_planning_entries_saved_tour_id ON public.planning_entries(saved_tour_id);

-- Add category 'planning' to saved_tours for auto-created tours from planning
-- (category column already exists)
