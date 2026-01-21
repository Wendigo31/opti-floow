
-- Enable realtime for company_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;

-- Create user_preferences table for cross-device sync
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Selected drivers for calculations
  selected_driver_ids TEXT[] DEFAULT '{}',
  
  -- Active vehicle/trailer selection
  selected_vehicle_id TEXT,
  selected_trailer_id TEXT,
  
  -- UI preferences
  sidebar_collapsed BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'fr',
  
  -- Calculator defaults
  default_pricing_mode TEXT DEFAULT 'km',
  default_target_margin NUMERIC DEFAULT 15,
  default_price_per_km NUMERIC DEFAULT 1.70,
  
  -- Dashboard preferences
  default_chart_type TEXT DEFAULT 'bar',
  show_ai_panel BOOLEAN DEFAULT true,
  
  -- Working days settings
  custom_working_days JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT user_preferences_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for user_preferences
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
