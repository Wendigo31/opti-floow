-- Fix company_invitations: Ensure RLS is enabled and restrict SELECT access
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations FORCE ROW LEVEL SECURITY;

-- Drop existing SELECT policy and recreate with stricter conditions
DROP POLICY IF EXISTS "Company members can view invitations" ON public.company_invitations;

-- Create secure SELECT policy - only authenticated users who are:
-- 1. Members of the target company (license)
-- 2. The person being invited (their email matches)
CREATE POLICY "Authenticated users can view relevant invitations only"
ON public.company_invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- User is a member of the company that created the invitation
    license_id IN (
      SELECT license_id 
      FROM public.company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true
    )
    OR
    -- User is the invitee (their email matches)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- Fix license_addons: Ensure RLS is enabled and restrict SELECT access
ALTER TABLE public.license_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_addons FORCE ROW LEVEL SECURITY;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own license addons" ON public.license_addons;

-- Create secure SELECT policy - only authenticated users viewing their own license's addons
CREATE POLICY "Authenticated users can view own license addons only"
ON public.license_addons
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND license_id IN (
    -- User owns this license
    SELECT id FROM public.licenses 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    UNION
    -- User is a member of the company with this license
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() 
      AND is_active = true
      AND license_id IS NOT NULL
  )
);