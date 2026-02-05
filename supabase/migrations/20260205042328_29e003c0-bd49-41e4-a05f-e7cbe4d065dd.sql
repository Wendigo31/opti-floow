-- Add sector_manager column to planning_entries
ALTER TABLE public.planning_entries 
ADD COLUMN IF NOT EXISTS sector_manager TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.planning_entries.sector_manager IS 'Responsable de secteur pour filtrer les tractions';