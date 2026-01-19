-- Add a permissive policy that allows service_role full access
-- This ensures that edge functions can read/write company_users

-- For SELECT: Allow all when using service role (no auth context means service role)
CREATE POLICY "Service role can view all company_users"
ON public.company_users
FOR SELECT
TO service_role
USING (true);

-- For INSERT: Allow all when using service role
CREATE POLICY "Service role can insert company_users"
ON public.company_users
FOR INSERT
TO service_role
WITH CHECK (true);

-- For UPDATE: Allow all when using service role
CREATE POLICY "Service role can update company_users"
ON public.company_users
FOR UPDATE
TO service_role
USING (true);

-- For DELETE: Allow all when using service role
CREATE POLICY "Service role can delete company_users"
ON public.company_users
FOR DELETE
TO service_role
USING (true);