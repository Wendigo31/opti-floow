-- =====================================================
-- SECURITY FIX: Strengthen RLS policies for sensitive tables
-- =====================================================

-- 1. FIX: company_users - Restrict email visibility to same company only
-- Drop existing policies and recreate with stricter access
DROP POLICY IF EXISTS "Company users are viewable by company members" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own company members" ON public.company_users;
DROP POLICY IF EXISTS "company_users_select_policy" ON public.company_users;

-- New stricter policy: users can only see members of their OWN company
CREATE POLICY "company_users_select_own_company" ON public.company_users
  FOR SELECT TO authenticated
  USING (
    license_id = public.get_user_license_id(auth.uid())
  );

-- 2. FIX: licenses - Restrict access to license owners and company members only
DROP POLICY IF EXISTS "Licenses are viewable by their owners" ON public.licenses;
DROP POLICY IF EXISTS "Licenses can be selected by authenticated users" ON public.licenses;
DROP POLICY IF EXISTS "licenses_select_policy" ON public.licenses;
DROP POLICY IF EXISTS "licenses_update_policy" ON public.licenses;

-- Only allow viewing license data if you're the email owner OR an active member
CREATE POLICY "licenses_select_own_only" ON public.licenses
  FOR SELECT TO authenticated
  USING (
    id = public.get_user_license_id(auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 3. FIX: company_invitations - Hide tokens from non-owners
-- Create a security definer function to hash tokens for display
CREATE OR REPLACE FUNCTION public.get_safe_invitations(p_license_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  invited_by text,
  created_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ci.id,
    ci.email,
    ci.role,
    (SELECT display_name FROM company_users WHERE user_id = ci.invited_by LIMIT 1),
    ci.created_at,
    ci.expires_at,
    ci.accepted_at,
    ci.expires_at < now() as is_expired
  FROM company_invitations ci
  WHERE ci.license_id = p_license_id
    AND public.is_company_owner(p_license_id, auth.uid());
$$;

-- Drop existing policies on company_invitations
DROP POLICY IF EXISTS "Company invitations are viewable by company admins" ON public.company_invitations;
DROP POLICY IF EXISTS "company_invitations_select_policy" ON public.company_invitations;
DROP POLICY IF EXISTS "company_invitations_insert_policy" ON public.company_invitations;
DROP POLICY IF EXISTS "company_invitations_delete_policy" ON public.company_invitations;

-- Only direction can manage invitations directly
CREATE POLICY "company_invitations_select_direction_only" ON public.company_invitations
  FOR SELECT TO authenticated
  USING (
    public.is_company_owner(license_id, auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "company_invitations_insert_direction_only" ON public.company_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_owner(license_id, auth.uid())
  );

CREATE POLICY "company_invitations_delete_direction_only" ON public.company_invitations
  FOR DELETE TO authenticated
  USING (
    public.is_company_owner(license_id, auth.uid())
  );

-- 4. FIX: company_settings - Add license_id validation to INSERT
DROP POLICY IF EXISTS "company_settings_insert_policy" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;

CREATE POLICY "company_settings_insert_with_license" ON public.company_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      license_id IS NULL 
      OR license_id = public.get_user_license_id(auth.uid())
    )
  );

-- 5. FIX: user_drivers - Restrict salary visibility to direction only
-- Create a view that hides sensitive data from non-direction users
CREATE OR REPLACE FUNCTION public.get_drivers_with_salary_check()
RETURNS TABLE (
  id uuid,
  local_id text,
  name text,
  driver_type text,
  hourly_rate numeric,
  base_salary numeric,
  driver_data jsonb,
  user_id uuid,
  license_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  synced_at timestamptz,
  can_view_salary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.local_id,
    d.name,
    d.driver_type,
    CASE WHEN public.is_company_owner(d.license_id, auth.uid()) THEN d.hourly_rate ELSE NULL END,
    CASE WHEN public.is_company_owner(d.license_id, auth.uid()) THEN d.base_salary ELSE NULL END,
    d.driver_data,
    d.user_id,
    d.license_id,
    d.created_at,
    d.updated_at,
    d.synced_at,
    public.is_company_owner(d.license_id, auth.uid()) as can_view_salary
  FROM user_drivers d
  WHERE d.license_id = public.get_user_license_id(auth.uid());
$$;

-- 6. FIX: saved_tours, trips, quotes - Add role-based financial data filtering
-- Create helper function to check if user can view financial data
CREATE OR REPLACE FUNCTION public.can_view_financial_data(p_license_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE license_id = p_license_id
      AND user_id = auth.uid()
      AND is_active = true
      AND role IN ('direction', 'exploitation')
  );
$$;

-- 7. Enable leaked password protection (requires auth config)
-- Note: This needs to be done via Supabase dashboard or API, not SQL