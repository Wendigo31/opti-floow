-- Create active_itinerary_sessions table for real-time collaboration
CREATE TABLE public.active_itinerary_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_id uuid REFERENCES public.licenses(id),
  display_name text,
  origin_address text DEFAULT '',
  origin_lat double precision,
  origin_lon double precision,
  destination_address text DEFAULT '',
  destination_lat double precision,
  destination_lon double precision,
  stops jsonb DEFAULT '[]'::jsonb,
  selected_vehicle_id text,
  selected_client_id text,
  avoid_low_bridges boolean DEFAULT true,
  avoid_weight_restrictions boolean DEFAULT true,
  avoid_truck_forbidden boolean DEFAULT true,
  highway_route jsonb,
  national_route jsonb,
  selected_route_type text DEFAULT 'highway',
  is_panel_open boolean DEFAULT true,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.active_itinerary_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies - Company members can see each other's sessions
CREATE POLICY "Company members can view all sessions"
ON public.active_itinerary_sessions FOR SELECT
USING (
  user_id = auth.uid() OR license_id = get_user_license_id(auth.uid())
);

CREATE POLICY "Users can insert their session"
ON public.active_itinerary_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their session"
ON public.active_itinerary_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their session"
ON public.active_itinerary_sessions FOR DELETE
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_active_sessions_license ON public.active_itinerary_sessions(license_id);
CREATE INDEX idx_active_sessions_activity ON public.active_itinerary_sessions(last_activity_at DESC);

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_itinerary_sessions;

-- Set replica identity for full row updates
ALTER TABLE public.active_itinerary_sessions REPLICA IDENTITY FULL;