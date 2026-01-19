-- =============================================
-- SECURE LOGIN_HISTORY TABLE
-- =============================================
-- Enable RLS on login_history if not already enabled
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all access" ON public.login_history;
DROP POLICY IF EXISTS "Anyone can read login history" ON public.login_history;

-- Block all public access - only accessible via edge functions with service role
CREATE POLICY "No public access to login_history"
ON public.login_history
FOR ALL
USING (false);

COMMENT ON TABLE public.login_history IS 'Login history - accessible only via edge functions with service role key. Contains sensitive login tracking data.';