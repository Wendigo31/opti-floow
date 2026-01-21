-- Fix infinite recursion in RLS policies for public.company_users
-- Root cause: a SELECT policy referencing company_users inside its own USING clause.

-- 1) Helper function (SECURITY DEFINER) to check if a user can view all members of a license
CREATE OR REPLACE FUNCTION public.can_view_company_members(p_license_id uuid, p_user_id uuid)
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
      AND role = ANY (ARRAY['owner','admin','direction','responsable'])
  );
$$;

-- 2) Replace the recursive policy with a safe one
DROP POLICY IF EXISTS "Admins can view all company members" ON public.company_users;

CREATE POLICY "Admins can view all company members"
ON public.company_users
FOR SELECT
USING (public.can_view_company_members(license_id, auth.uid()));
