-- Create security definer function to check if a user is owner/admin for a license
CREATE OR REPLACE FUNCTION public.is_company_admin(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
$$;

-- Create security definer function to check if a user is owner for a license
CREATE OR REPLACE FUNCTION public.is_company_owner(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND is_active = true
  )
$$;

-- Create security definer function to check if user is a member of a license
CREATE OR REPLACE FUNCTION public.is_company_member(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND is_active = true
  )
$$;

-- Create security definer function to get user's license_id
CREATE OR REPLACE FUNCTION public.get_user_license_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT license_id
  FROM public.company_users
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1
$$;

-- Create security definer function to check if any member exists for a license
CREATE OR REPLACE FUNCTION public.license_has_members(p_license_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE license_id = p_license_id
  )
$$;

-- Drop existing problematic policies on company_users
DROP POLICY IF EXISTS "Users can view their company members" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.company_users;
DROP POLICY IF EXISTS "Owners can delete members" ON public.company_users;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view their company members"
ON public.company_users
FOR SELECT
USING (
  license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Owners and admins can invite members"
ON public.company_users
FOR INSERT
WITH CHECK (
  public.is_company_admin(license_id, auth.uid())
  OR NOT public.license_has_members(license_id)
);

CREATE POLICY "Owners and admins can update members"
ON public.company_users
FOR UPDATE
USING (
  -- Owners can update anyone except other owners
  (public.is_company_owner(license_id, auth.uid()) AND role <> 'owner')
  OR
  -- Admins can update non-owners/non-admins
  (public.is_company_admin(license_id, auth.uid()) AND role = 'member')
  OR
  -- Users can update their own record (for accepting invites)
  user_id = auth.uid()
);

CREATE POLICY "Owners can delete members"
ON public.company_users
FOR DELETE
USING (
  public.is_company_owner(license_id, auth.uid())
  AND role <> 'owner'
);

-- Fix company_invitations policies that also have recursion
DROP POLICY IF EXISTS "Company members can view invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can delete invitations" ON public.company_invitations;

CREATE POLICY "Company members can view invitations"
ON public.company_invitations
FOR SELECT
USING (
  license_id = public.get_user_license_id(auth.uid())
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);

CREATE POLICY "Owners and admins can create invitations"
ON public.company_invitations
FOR INSERT
WITH CHECK (
  public.is_company_admin(license_id, auth.uid())
);

CREATE POLICY "Owners and admins can delete invitations"
ON public.company_invitations
FOR DELETE
USING (
  public.is_company_admin(license_id, auth.uid())
);