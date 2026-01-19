-- =============================================
-- SECURE RATE_LIMITS TABLE
-- =============================================
-- Enable RLS on rate_limits if not already enabled
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Allow all access" ON public.rate_limits;
DROP POLICY IF EXISTS "Anyone can read rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Public access" ON public.rate_limits;

-- Block all public access - only accessible via edge functions with service role
CREATE POLICY "No public access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);

COMMENT ON TABLE public.rate_limits IS 'Rate limiting data - accessible only via edge functions with service role key. No direct client access allowed.';