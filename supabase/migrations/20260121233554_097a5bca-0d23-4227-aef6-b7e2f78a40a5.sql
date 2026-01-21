-- Fix: Allow all company members to view other members of the same company (not just admins)
-- This is needed for realtime sync to work properly

-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can view all company members" ON public.company_users;

-- Create a new policy that allows any active member to see other members in their company
CREATE POLICY "Company members can view all members"
ON public.company_users
FOR SELECT
USING (
  -- User can always see their own record
  user_id = auth.uid()
  OR
  -- Or they can see any member in the same company as them
  license_id = get_user_license_id(auth.uid())
);