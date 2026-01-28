-- Create user_sessions table for storing calculator state per user
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  -- Calculator state
  vehicle_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  trip_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_driver_ids TEXT[] DEFAULT '{}',
  -- Metadata
  last_saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint: one session per user per license
  UNIQUE(user_id, license_id)
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own session
CREATE POLICY "Users can view their own session"
ON public.user_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own session"
ON public.user_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own session"
ON public.user_sessions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own session"
ON public.user_sessions FOR DELETE
USING (user_id = auth.uid());

-- Service role full access for admin
CREATE POLICY "Service role full access"
ON public.user_sessions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable realtime for cross-device sync
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_license ON public.user_sessions(user_id, license_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();