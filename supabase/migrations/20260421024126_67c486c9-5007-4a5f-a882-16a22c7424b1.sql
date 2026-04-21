
-- 1. CLIENTS: recreate safe view with sensitive masking
DROP VIEW IF EXISTS public.clients_safe CASCADE;

CREATE VIEW public.clients_safe
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  license_id,
  name,
  company,
  city,
  country,
  postal_code,
  notes,
  created_at,
  updated_at,
  CASE WHEN can_view_client_sensitive_data(license_id) THEN email ELSE NULL END AS email,
  CASE WHEN can_view_client_sensitive_data(license_id) THEN phone ELSE NULL END AS phone,
  CASE WHEN can_view_client_sensitive_data(license_id) THEN siret ELSE NULL END AS siret,
  CASE WHEN can_view_client_sensitive_data(license_id) THEN address ELSE NULL END AS address
FROM public.clients
WHERE license_id = get_user_license_id(auth.uid());

-- 2. COMPANY_CONFIG: remove permissive policies
DROP POLICY IF EXISTS "Company members can insert config" ON public.company_config;
DROP POLICY IF EXISTS "Company members can delete config" ON public.company_config;
DROP POLICY IF EXISTS "Company members can update config" ON public.company_config;

CREATE POLICY "Company admins can update config"
ON public.company_config
FOR UPDATE
TO authenticated
USING (
  license_id = get_user_license_id(auth.uid())
  AND is_company_admin(license_id, auth.uid())
)
WITH CHECK (
  license_id = get_user_license_id(auth.uid())
  AND is_company_admin(license_id, auth.uid())
);

CREATE POLICY "Company admins can delete config"
ON public.company_config
FOR DELETE
TO authenticated
USING (
  license_id = get_user_license_id(auth.uid())
  AND is_company_admin(license_id, auth.uid())
);

-- 3. COMPANY_USERS: remove unsafe bootstrap bypass
DROP POLICY IF EXISTS "Direction and responsable can invite members" ON public.company_users;

CREATE POLICY "Direction can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_company_admin(license_id, auth.uid())
);
