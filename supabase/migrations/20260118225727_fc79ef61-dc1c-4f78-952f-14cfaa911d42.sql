-- Fix conflicting RLS policies on licenses table
-- Problem: Two RESTRICTIVE policies conflict - 'No public access' (USING false) blocks everything

-- Drop the conflicting policies
DROP POLICY IF EXISTS "No public access to licenses" ON public.licenses;
DROP POLICY IF EXISTS "Users can view their own license" ON public.licenses;

-- Create a single PERMISSIVE policy that only allows users to see their own license
-- This properly restricts access without blocking legitimate users
CREATE POLICY "Users can view their own license"
ON public.licenses
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Block all write operations from clients (only admin via service role)
CREATE POLICY "No public write access to licenses"
ON public.licenses
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update access to licenses"
ON public.licenses
FOR UPDATE
USING (false);

CREATE POLICY "No public delete access to licenses"
ON public.licenses
FOR DELETE
USING (false);