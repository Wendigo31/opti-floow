-- Create search_history table for storing itinerary searches
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_id uuid REFERENCES public.licenses(id),
  origin_address text NOT NULL,
  origin_lat double precision,
  origin_lon double precision,
  destination_address text NOT NULL,
  destination_lat double precision,
  destination_lon double precision,
  stops jsonb DEFAULT '[]'::jsonb,
  vehicle_id text,
  client_id text,
  calculated boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company members can view search history"
ON public.search_history FOR SELECT
USING (
  user_id = auth.uid() OR license_id = get_user_license_id(auth.uid())
);

CREATE POLICY "Users can insert search history"
ON public.search_history FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their search history"
ON public.search_history FOR UPDATE
USING (user_id = auth.uid() OR license_id = get_user_license_id(auth.uid()));

CREATE POLICY "Users can delete their search history"
ON public.search_history FOR DELETE
USING (user_id = auth.uid() OR license_id = get_user_license_id(auth.uid()));

-- Index for performance
CREATE INDEX idx_search_history_user_license ON public.search_history(user_id, license_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.search_history;