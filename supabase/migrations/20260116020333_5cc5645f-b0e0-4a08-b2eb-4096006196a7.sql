-- Create rate limits table for tracking failed attempts
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  attempts integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  locked_until timestamptz,
  UNIQUE(identifier, action_type)
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, action_type);

-- Enable RLS (but no policies needed - accessed via service role only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action text NOT NULL,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (accessed via service role only)
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create index for audit log queries
CREATE INDEX idx_admin_audit_created ON public.admin_audit_log(created_at DESC);

-- Function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE last_attempt_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;