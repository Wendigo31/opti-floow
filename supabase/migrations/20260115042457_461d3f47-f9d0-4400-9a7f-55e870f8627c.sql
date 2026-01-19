-- =============================================
-- Fix RLS policies for licenses, license_features, saved_tours
-- =============================================

-- 1. LICENSES TABLE - Enable RLS and restrict access
-- Users should only be able to read their own license (by email match)
-- The validate-license edge function handles all validation server-side

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own license when authenticated and email matches
CREATE POLICY "Users can view their own license"
ON public.licenses
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. LICENSE_FEATURES TABLE - Restrict to own license features only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "License features are viewable" ON public.license_features;

-- Users can only view features for their own license
CREATE POLICY "Users can view their own license features"
ON public.license_features
FOR SELECT
TO authenticated
USING (
  license_id IN (
    SELECT id FROM public.licenses 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 3. SAVED_TOURS TABLE - Fix all overly permissive policies
-- Drop existing policies with 'true' condition
DROP POLICY IF EXISTS "Users can view their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can create saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can update their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can delete their own saved tours" ON public.saved_tours;

-- Note: saved_tours.user_id is TEXT type, so we cast auth.uid() to text
CREATE POLICY "Users can view their own saved tours"
ON public.saved_tours
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own saved tours"
ON public.saved_tours
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own saved tours"
ON public.saved_tours
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own saved tours"
ON public.saved_tours
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);