
-- =========================================================
-- 1. LICENCES : RLS plus stricte (uniquement via company_users)
-- =========================================================
DROP POLICY IF EXISTS "licenses_select_own_only" ON public.licenses;

CREATE POLICY "licenses_select_company_member_only"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  id = public.get_user_license_id(auth.uid())
);

-- =========================================================
-- 2. CLIENTS : restreindre la lecture des données sensibles
--    aux rôles Direction / Exploitation
-- =========================================================

-- Helper pour vérifier le rôle (réutilise can_view_financial_data sémantiquement)
CREATE OR REPLACE FUNCTION public.can_view_client_sensitive_data(p_license_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Remplacer la policy SELECT des clients
DROP POLICY IF EXISTS "clients_select_own_or_company" ON public.clients;

CREATE POLICY "clients_select_company_basic"
ON public.clients
FOR SELECT
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

-- Vue masquée pour les membres standards (utilisée côté front si nécessaire)
CREATE OR REPLACE VIEW public.clients_safe AS
SELECT
  id,
  user_id,
  license_id,
  name,
  company,
  city,
  country,
  notes,
  created_at,
  updated_at,
  CASE WHEN public.can_view_client_sensitive_data(license_id) THEN email      ELSE NULL END AS email,
  CASE WHEN public.can_view_client_sensitive_data(license_id) THEN phone      ELSE NULL END AS phone,
  CASE WHEN public.can_view_client_sensitive_data(license_id) THEN siret      ELSE NULL END AS siret,
  CASE WHEN public.can_view_client_sensitive_data(license_id) THEN address    ELSE NULL END AS address,
  CASE WHEN public.can_view_client_sensitive_data(license_id) THEN postal_code ELSE NULL END AS postal_code
FROM public.clients
WHERE license_id = public.get_user_license_id(auth.uid());

GRANT SELECT ON public.clients_safe TO authenticated;

-- =========================================================
-- 3. CLIENT_CONTACTS : restreindre à Direction / Exploitation
-- =========================================================
DROP POLICY IF EXISTS "client_contacts_select_own_company" ON public.client_contacts;

CREATE POLICY "client_contacts_select_privileged_only"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.license_id = public.get_user_license_id(auth.uid())
      AND public.can_view_client_sensitive_data(c.license_id)
  )
);

-- Aussi pour insert/update/delete (cohérence)
DROP POLICY IF EXISTS "client_contacts_insert_own_company" ON public.client_contacts;
DROP POLICY IF EXISTS "client_contacts_update_own_company" ON public.client_contacts;
DROP POLICY IF EXISTS "client_contacts_delete_own_company" ON public.client_contacts;

CREATE POLICY "client_contacts_insert_privileged"
ON public.client_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.license_id = public.get_user_license_id(auth.uid())
      AND public.can_view_client_sensitive_data(c.license_id)
  )
);

CREATE POLICY "client_contacts_update_privileged"
ON public.client_contacts
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.license_id = public.get_user_license_id(auth.uid())
      AND public.can_view_client_sensitive_data(c.license_id)
  )
);

CREATE POLICY "client_contacts_delete_privileged"
ON public.client_contacts
FOR DELETE
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.license_id = public.get_user_license_id(auth.uid())
      AND public.can_view_client_sensitive_data(c.license_id)
  )
);

-- =========================================================
-- 4. CLIENT_ADDRESSES : également restreint (adresses sensibles)
-- =========================================================
DROP POLICY IF EXISTS "client_addresses_select_own_company" ON public.client_addresses;

CREATE POLICY "client_addresses_select_privileged_only"
ON public.client_addresses
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    WHERE c.license_id = public.get_user_license_id(auth.uid())
      AND public.can_view_client_sensitive_data(c.license_id)
  )
);

-- =========================================================
-- 5. LICENSE_ADDONS : masquer les prix
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view own license addons only" ON public.license_addons;

-- Policy stricte : uniquement membres actifs de la société, pas par email
CREATE POLICY "license_addons_select_company_member"
ON public.license_addons
FOR SELECT
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

-- Vue sans prix pour utilisation côté client
CREATE OR REPLACE VIEW public.license_addons_safe AS
SELECT
  id,
  license_id,
  addon_id,
  addon_name,
  is_active,
  activated_at,
  deactivated_at,
  created_at,
  updated_at,
  -- Prix uniquement pour Direction
  CASE WHEN public.is_company_owner(license_id, auth.uid()) THEN monthly_price ELSE NULL END AS monthly_price,
  CASE WHEN public.is_company_owner(license_id, auth.uid()) THEN yearly_price  ELSE NULL END AS yearly_price
FROM public.license_addons
WHERE license_id = public.get_user_license_id(auth.uid());

GRANT SELECT ON public.license_addons_safe TO authenticated;
