-- Create planning_entries table for the interactive planning feature
CREATE TABLE public.planning_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  license_id UUID REFERENCES public.licenses(id),
  
  -- Date and time
  planning_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  -- Linked entities
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  driver_id TEXT, -- Local driver ID from user_drivers
  vehicle_id TEXT, -- Local vehicle ID from user_vehicles (traction)
  
  -- Mission order content
  mission_order TEXT,
  origin_address TEXT,
  destination_address TEXT,
  notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_planning_entries_date ON public.planning_entries(planning_date);
CREATE INDEX idx_planning_entries_license ON public.planning_entries(license_id);
CREATE INDEX idx_planning_entries_vehicle ON public.planning_entries(vehicle_id);
CREATE INDEX idx_planning_entries_driver ON public.planning_entries(driver_id);

-- Enable RLS
ALTER TABLE public.planning_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company-level access
CREATE POLICY "Users can view their company planning entries"
ON public.planning_entries
FOR SELECT
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Users can create planning entries for their company"
ON public.planning_entries
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND (
    license_id IS NULL 
    OR license_id = public.get_user_license_id(auth.uid())
  )
);

CREATE POLICY "Users can update their company planning entries"
ON public.planning_entries
FOR UPDATE
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Users can delete their company planning entries"
ON public.planning_entries
FOR DELETE
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

-- Enable realtime for planning entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_entries;

-- Trigger for updated_at
CREATE TRIGGER update_planning_entries_updated_at
BEFORE UPDATE ON public.planning_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();