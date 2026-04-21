
-- Harden service-role-only policies: restrict from {public} to service_role only
-- These policies all check auth.role() = 'service_role' so changing TO from public to service_role is safe

-- access_requests
DROP POLICY IF EXISTS "Service role full access" ON public.access_requests;
CREATE POLICY "Service role full access"
ON public.access_requests
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- company_config
DROP POLICY IF EXISTS "Service role full access config" ON public.company_config;
CREATE POLICY "Service role full access config"
ON public.company_config
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- company_sync_events
DROP POLICY IF EXISTS "Service role full access sync events" ON public.company_sync_events;
CREATE POLICY "Service role full access sync events"
ON public.company_sync_events
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- company_users
DROP POLICY IF EXISTS "Service role full access company_users" ON public.company_users;
CREATE POLICY "Service role full access company_users"
ON public.company_users
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- exploitation_metric_settings
DROP POLICY IF EXISTS "Service role full access" ON public.exploitation_metric_settings;
CREATE POLICY "Service role full access"
ON public.exploitation_metric_settings
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- login_history
DROP POLICY IF EXISTS "Service role can insert login_history" ON public.login_history;
CREATE POLICY "Service role can insert login_history"
ON public.login_history
AS PERMISSIVE
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read login_history" ON public.login_history;
CREATE POLICY "Service role can read login_history"
ON public.login_history
AS PERMISSIVE
FOR SELECT
TO service_role
USING (true);
