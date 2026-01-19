-- =============================================
-- 1. SECURE LICENSES TABLE
-- =============================================
-- Enable RLS on licenses if not already enabled
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies on licenses
DROP POLICY IF EXISTS "Allow read access" ON public.licenses;
DROP POLICY IF EXISTS "Anyone can read licenses" ON public.licenses;
DROP POLICY IF EXISTS "Public read access" ON public.licenses;

-- Block all public access to licenses - only accessible via edge functions with service role
CREATE POLICY "No public access to licenses"
ON public.licenses
FOR ALL
USING (false);

COMMENT ON TABLE public.licenses IS 'License data - accessible only via edge functions with service role key. Contains sensitive customer information.';

-- =============================================
-- 2. SECURE APP_UPDATES TABLE
-- =============================================
-- Enable RLS on app_updates if not already enabled
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies on app_updates
DROP POLICY IF EXISTS "Allow public read access" ON public.app_updates;
DROP POLICY IF EXISTS "Anyone can read app updates" ON public.app_updates;
DROP POLICY IF EXISTS "Public read access" ON public.app_updates;

-- Allow public to read ONLY active updates (for update notifications)
CREATE POLICY "Public can read active updates only"
ON public.app_updates
FOR SELECT
USING (is_active = true);

-- Block all write operations from public - only via edge functions with service role
CREATE POLICY "No public write access to app_updates"
ON public.app_updates
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update access to app_updates"
ON public.app_updates
FOR UPDATE
USING (false);

CREATE POLICY "No public delete access to app_updates"
ON public.app_updates
FOR DELETE
USING (false);

COMMENT ON TABLE public.app_updates IS 'App updates - read-only for active updates, write operations only via edge functions with service role key.';