-- Drop existing SELECT policy for company_users
DROP POLICY IF EXISTS "Users can view own company members only" ON public.company_users;

-- Create new restrictive policies:
-- 1. Users can always see their own record
CREATE POLICY "Users can view their own record"
ON public.company_users
FOR SELECT
USING (user_id = auth.uid());

-- 2. Admins and owners can see all members of their company
CREATE POLICY "Admins can view all company members"
ON public.company_users
FOR SELECT
USING (
  license_id IN (
    SELECT cu.license_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true 
      AND cu.role IN ('owner', 'admin')
  )
);

-- Create a function that returns limited member info for non-admins (display_name only, no email)
CREATE OR REPLACE FUNCTION public.get_company_members_safe()
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  is_current_user BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cu.id,
    cu.display_name,
    cu.role,
    cu.is_active,
    (cu.user_id = auth.uid()) as is_current_user
  FROM public.company_users cu
  WHERE cu.license_id = get_user_license_id(auth.uid())
    AND cu.is_active = true
  ORDER BY 
    CASE cu.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      ELSE 3 
    END,
    cu.display_name;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_company_members_safe() TO authenticated;