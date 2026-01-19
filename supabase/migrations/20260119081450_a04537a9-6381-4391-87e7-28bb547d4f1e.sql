-- Fix RLS policy to be more restrictive - only allow access via service role
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.license_addons;

-- Create proper RLS policies
-- Read access for authenticated users who own the license
CREATE POLICY "Users can view their own license addons"
ON public.license_addons
FOR SELECT
USING (
  license_id IN (
    SELECT id FROM public.licenses 
    WHERE license_code = current_setting('request.jwt.claims', true)::json->>'sub'
    OR email = current_setting('request.jwt.claims', true)::json->>'email'
  )
);

-- Admin operations will use service_role key which bypasses RLS