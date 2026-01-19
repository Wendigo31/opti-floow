-- Enable RLS on admin_audit_log if not already enabled
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Admin audit log is viewable by admins only" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Anyone can read admin audit log" ON public.admin_audit_log;

-- Create restrictive policy - only authenticated admins can read audit logs
-- Since there's no admin role system, we block all public access
-- Admin access is only via edge functions with service role key
CREATE POLICY "No public access to admin audit log"
ON public.admin_audit_log
FOR ALL
USING (false);

-- Optional: Allow admins to insert (via edge function with service role, this policy is for documentation)
-- The service role bypasses RLS, so this is just to document intent
COMMENT ON TABLE public.admin_audit_log IS 'Admin audit log - accessible only via edge functions with service role key. No direct client access allowed.';