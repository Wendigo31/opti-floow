-- Create vehicles table for synced vehicle data
CREATE TABLE public.user_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  license_plate TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  vehicle_type TEXT DEFAULT 'tracteur',
  fuel_consumption NUMERIC DEFAULT 32,
  fuel_type TEXT DEFAULT 'diesel',
  current_km INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  vehicle_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);

-- Create drivers table for synced driver data
CREATE TABLE public.user_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  driver_type TEXT DEFAULT 'cdi',
  base_salary NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  driver_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);

-- Create charges table for synced fixed charges
CREATE TABLE public.user_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_ht BOOLEAN DEFAULT false,
  periodicity TEXT DEFAULT 'monthly',
  category TEXT DEFAULT 'other',
  charge_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);

-- Enable RLS
ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_charges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_vehicles
CREATE POLICY "Users can view their own vehicles"
ON public.user_vehicles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vehicles"
ON public.user_vehicles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
ON public.user_vehicles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
ON public.user_vehicles FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_drivers
CREATE POLICY "Users can view their own drivers"
ON public.user_drivers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drivers"
ON public.user_drivers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drivers"
ON public.user_drivers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drivers"
ON public.user_drivers FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_charges
CREATE POLICY "Users can view their own charges"
ON public.user_charges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charges"
ON public.user_charges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charges"
ON public.user_charges FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charges"
ON public.user_charges FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_vehicles_updated_at
  BEFORE UPDATE ON public.user_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_drivers_updated_at
  BEFORE UPDATE ON public.user_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_charges_updated_at
  BEFORE UPDATE ON public.user_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();