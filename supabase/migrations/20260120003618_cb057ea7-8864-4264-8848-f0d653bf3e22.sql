-- Fix licenses table to explicitly block anonymous/unauthenticated access

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own license" ON public.licenses;

-- Create a new SELECT policy that explicitly requires authentication
-- and only allows users to see their own license by matching email
CREATE POLICY "Authenticated users can view their own license" 
ON public.licenses 
FOR SELECT 
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL 
  AND (
    -- Match by email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR
    -- Or user is part of a company with this license
    id IN (
      SELECT license_id FROM public.company_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);