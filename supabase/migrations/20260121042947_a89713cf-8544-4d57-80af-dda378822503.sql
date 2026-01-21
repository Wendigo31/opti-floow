-- Drop the redundant and overlapping SELECT policies
DROP POLICY IF EXISTS "Users can read own company membership" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their company members" ON public.company_users;

-- Create a single, secure SELECT policy that only allows:
-- 1. Users to see their own record
-- 2. Members of the same company (verified via get_user_license_id) to see each other
CREATE POLICY "Users can view own company members only"
ON public.company_users
FOR SELECT
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Can always see own record
    user_id = auth.uid()
    OR
    -- Can see other members only if in the same company
    (
      license_id IS NOT NULL 
      AND license_id = get_user_license_id(auth.uid())
    )
  )
);