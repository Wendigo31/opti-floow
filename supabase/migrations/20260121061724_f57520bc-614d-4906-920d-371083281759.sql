-- Step 1: Drop ALL policies that depend on the helper functions
-- company_users policies
DROP POLICY IF EXISTS "Direction and responsable can invite members" ON company_users;
DROP POLICY IF EXISTS "Direction and responsable can update members" ON company_users;
DROP POLICY IF EXISTS "Direction can delete members" ON company_users;

-- company_invitations policies
DROP POLICY IF EXISTS "Direction and responsable can create invitations" ON company_invitations;
DROP POLICY IF EXISTS "Direction and responsable can delete invitations" ON company_invitations;

-- charge_presets policies that use get_user_license_id
DROP POLICY IF EXISTS "Company members can view charge presets" ON charge_presets;
DROP POLICY IF EXISTS "Company members can create charge presets" ON charge_presets;
DROP POLICY IF EXISTS "Company members can update charge presets" ON charge_presets;
DROP POLICY IF EXISTS "Company members can delete charge presets" ON charge_presets;

-- Step 2: Drop ALL the helper functions
DROP FUNCTION IF EXISTS public.is_company_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_company_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.license_has_members(uuid);
DROP FUNCTION IF EXISTS public.get_user_license_id(uuid);

-- Step 3: Recreate ALL functions with SECURITY DEFINER to bypass RLS
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
      AND role IN ('direction', 'responsable')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(p_license_id uuid, p_user_id uuid)
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
      AND role = 'direction'
  );
$$;

CREATE OR REPLACE FUNCTION public.license_has_members(p_license_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE license_id = p_license_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_license_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT license_id FROM company_users
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
$$;

-- Step 4: Recreate company_users policies
CREATE POLICY "Direction and responsable can invite members"
ON company_users FOR INSERT
WITH CHECK (is_company_admin(license_id, auth.uid()) OR NOT license_has_members(license_id));

CREATE POLICY "Direction and responsable can update members"
ON company_users FOR UPDATE
USING (
  (is_company_owner(license_id, auth.uid()) AND role <> 'direction')
  OR (is_company_admin(license_id, auth.uid()) AND role = 'exploitation')
  OR (user_id = auth.uid())
);

CREATE POLICY "Direction can delete members"
ON company_users FOR DELETE
USING (is_company_owner(license_id, auth.uid()) AND role <> 'direction');

-- Step 5: Recreate company_invitations policies
CREATE POLICY "Direction and responsable can create invitations"
ON company_invitations FOR INSERT
WITH CHECK (is_company_admin(license_id, auth.uid()));

CREATE POLICY "Direction and responsable can delete invitations"
ON company_invitations FOR DELETE
USING (is_company_admin(license_id, auth.uid()));

-- Step 6: Recreate charge_presets policies
CREATE POLICY "Company members can view charge presets"
ON charge_presets FOR SELECT
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);

CREATE POLICY "Company members can create charge presets"
ON charge_presets FOR INSERT
WITH CHECK (
  (created_by = auth.uid())
  AND ((license_id IS NULL) OR (license_id = get_user_license_id(auth.uid())))
);

CREATE POLICY "Company members can update charge presets"
ON charge_presets FOR UPDATE
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);

CREATE POLICY "Company members can delete charge presets"
ON charge_presets FOR DELETE
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);