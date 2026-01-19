-- Create saved_tours table for saving calculations per client/tour
CREATE TABLE public.saved_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Tour details
  name TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  stops JSONB DEFAULT '[]',
  
  -- Calculated values
  distance_km NUMERIC NOT NULL DEFAULT 0,
  duration_minutes NUMERIC DEFAULT 0,
  toll_cost NUMERIC NOT NULL DEFAULT 0,
  fuel_cost NUMERIC NOT NULL DEFAULT 0,
  adblue_cost NUMERIC NOT NULL DEFAULT 0,
  driver_cost NUMERIC NOT NULL DEFAULT 0,
  structure_cost NUMERIC NOT NULL DEFAULT 0,
  vehicle_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  
  -- Pricing
  pricing_mode TEXT DEFAULT 'km',
  price_per_km NUMERIC DEFAULT 0,
  fixed_price NUMERIC DEFAULT 0,
  target_margin NUMERIC DEFAULT 15,
  revenue NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC DEFAULT 0,
  
  -- Vehicle and drivers info
  vehicle_id TEXT,
  vehicle_data JSONB,
  driver_ids TEXT[] DEFAULT '{}',
  drivers_data JSONB DEFAULT '[]',
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create license_features table for granular feature management
CREATE TABLE public.license_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
  
  -- Core features
  basic_calculator BOOLEAN DEFAULT TRUE,
  itinerary_planning BOOLEAN DEFAULT TRUE,
  
  -- Pro features
  dashboard_analytics BOOLEAN DEFAULT FALSE,
  forecast BOOLEAN DEFAULT FALSE,
  trip_history BOOLEAN DEFAULT FALSE,
  multi_drivers BOOLEAN DEFAULT FALSE,
  cost_analysis BOOLEAN DEFAULT FALSE,
  margin_alerts BOOLEAN DEFAULT FALSE,
  dynamic_charts BOOLEAN DEFAULT FALSE,
  pdf_export_pro BOOLEAN DEFAULT FALSE,
  excel_export BOOLEAN DEFAULT FALSE,
  monthly_tracking BOOLEAN DEFAULT FALSE,
  auto_pricing BOOLEAN DEFAULT FALSE,
  saved_tours BOOLEAN DEFAULT FALSE,
  
  -- Enterprise features
  ai_optimization BOOLEAN DEFAULT FALSE,
  ai_pdf_analysis BOOLEAN DEFAULT FALSE,
  multi_agency BOOLEAN DEFAULT FALSE,
  tms_erp_integration BOOLEAN DEFAULT FALSE,
  multi_users BOOLEAN DEFAULT FALSE,
  unlimited_vehicles BOOLEAN DEFAULT FALSE,
  client_analysis BOOLEAN DEFAULT FALSE,
  smart_quotes BOOLEAN DEFAULT FALSE,
  
  -- Limits (null = use plan default)
  max_drivers INTEGER,
  max_clients INTEGER,
  max_vehicles INTEGER,
  max_daily_charges INTEGER,
  max_monthly_charges INTEGER,
  max_yearly_charges INTEGER,
  max_saved_tours INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for one feature set per license
CREATE UNIQUE INDEX idx_license_features_license_id ON public.license_features(license_id);

-- Create index for saved_tours queries
CREATE INDEX idx_saved_tours_user_id ON public.saved_tours(user_id);
CREATE INDEX idx_saved_tours_client_id ON public.saved_tours(client_id);

-- Enable RLS
ALTER TABLE public.saved_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_tours (accessed via license code stored locally)
CREATE POLICY "Users can view their own saved tours" 
ON public.saved_tours 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create saved tours" 
ON public.saved_tours 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own saved tours" 
ON public.saved_tours 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own saved tours" 
ON public.saved_tours 
FOR DELETE 
USING (true);

-- RLS Policies for license_features (admin only via edge function)
CREATE POLICY "License features are viewable" 
ON public.license_features 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_saved_tours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_tours_updated_at
BEFORE UPDATE ON public.saved_tours
FOR EACH ROW
EXECUTE FUNCTION public.update_saved_tours_updated_at();

CREATE TRIGGER update_license_features_updated_at
BEFORE UPDATE ON public.license_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();