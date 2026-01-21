-- Ensure RLS is enabled and forced on licenses table
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses FORCE ROW LEVEL SECURITY;

-- Drop existing SELECT policy and recreate with stricter conditions
DROP POLICY IF EXISTS "Authenticated users can view their own license" ON public.licenses;

-- Create a more explicit and secure SELECT policy
CREATE POLICY "Authenticated users can view own license only"
ON public.licenses
FOR SELECT
USING (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- User owns this license (email match)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR
    -- User is an active member of the company with this license
    id IN (
      SELECT license_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
        AND license_id IS NOT NULL
    )
  )
);