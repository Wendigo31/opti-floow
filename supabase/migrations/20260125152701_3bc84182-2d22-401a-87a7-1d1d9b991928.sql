-- Drop existing role constraint
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;

-- Add new constraint with only the 3 allowed roles
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role = ANY (ARRAY['direction'::text, 'exploitation'::text, 'membre'::text]));

-- Migrate any existing 'responsable' roles to 'exploitation'
UPDATE public.company_users 
SET role = 'exploitation' 
WHERE role = 'responsable';

-- Update RLS helper function to use correct roles (no responsable)
CREATE OR REPLACE FUNCTION public.is_company_admin(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND is_active = true
      AND role IN ('direction', 'exploitation')
  );
$$;

-- Update can_view_company_members to use correct roles
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
      AND role = ANY (ARRAY['direction','exploitation'])
  );
$$;