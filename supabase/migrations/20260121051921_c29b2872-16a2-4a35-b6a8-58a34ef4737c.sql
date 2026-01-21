-- Update the role check constraint to only include new roles
ALTER TABLE public.company_users 
DROP CONSTRAINT IF EXISTS company_users_role_check;

ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role = ANY (ARRAY['direction'::text, 'responsable'::text, 'exploitation'::text]));

-- Update RLS helper functions to use new roles
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
      AND role IN ('direction', 'responsable')
      AND is_active = true
  )
$$;

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
      AND role = 'direction'
      AND is_active = true
  )
$$;