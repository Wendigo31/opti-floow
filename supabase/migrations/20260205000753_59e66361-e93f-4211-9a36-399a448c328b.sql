-- Add columns to planning_entries for recurring tours and relay drivers
ALTER TABLE public.planning_entries
ADD COLUMN IF NOT EXISTS tour_name TEXT,
ADD COLUMN IF NOT EXISTS recurring_days INTEGER[] DEFAULT '{}', -- 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
ADD COLUMN IF NOT EXISTS is_all_year BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS relay_driver_id TEXT, -- Second driver for relay
ADD COLUMN IF NOT EXISTS relay_location TEXT, -- Relay location
ADD COLUMN IF NOT EXISTS relay_time TIME, -- Relay time
ADD COLUMN IF NOT EXISTS parent_tour_id UUID REFERENCES public.planning_entries(id) ON DELETE CASCADE;

-- Create index for parent_tour_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_planning_entries_parent ON public.planning_entries(parent_tour_id);

-- Update REPLICA IDENTITY for realtime
ALTER TABLE public.planning_entries REPLICA IDENTITY FULL;