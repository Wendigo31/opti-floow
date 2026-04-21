
-- 1. Remove exploitation-on-exploitation update policy (privilege risk)
DROP POLICY IF EXISTS "Exploitation can update exploitation members" ON public.company_users;

-- 2. Convert overly-broad {public} policies to {authenticated} on company_users
DROP POLICY IF EXISTS "Direction can delete members" ON public.company_users;
CREATE POLICY "Direction can delete members"
ON public.company_users
FOR DELETE
TO authenticated
USING (is_company_owner(license_id, auth.uid()) AND role <> 'direction');

DROP POLICY IF EXISTS "Members can update own non-sensitive fields" ON public.company_users;
CREATE POLICY "Members can update own non-sensitive fields"
ON public.company_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT cu.role FROM company_users cu WHERE cu.id = company_users.id)
  AND license_id = (SELECT cu.license_id FROM company_users cu WHERE cu.id = company_users.id)
  AND is_active = (SELECT cu.is_active FROM company_users cu WHERE cu.id = company_users.id)
);

-- 3. Tighten company_config remaining {public} policies
DROP POLICY IF EXISTS "Company members can view config" ON public.company_config;
CREATE POLICY "Company members can view config"
ON public.company_config
FOR SELECT
TO authenticated
USING (license_id = get_user_license_id(auth.uid()));

-- 4. Tighten charge_presets {public} policies
DROP POLICY IF EXISTS "Company members can delete charge presets" ON public.charge_presets;
CREATE POLICY "Company members can delete charge presets"
ON public.charge_presets
FOR DELETE
TO authenticated
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);

DROP POLICY IF EXISTS "Company members can update charge presets" ON public.charge_presets;
CREATE POLICY "Company members can update charge presets"
ON public.charge_presets
FOR UPDATE
TO authenticated
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);

DROP POLICY IF EXISTS "Company members can view charge presets" ON public.charge_presets;
CREATE POLICY "Company members can view charge presets"
ON public.charge_presets
FOR SELECT
TO authenticated
USING (
  ((license_id IS NOT NULL) AND (license_id = get_user_license_id(auth.uid())))
  OR ((license_id IS NULL) AND (created_by = auth.uid()))
);

-- 5. Tighten exploitation_metric_settings {public} policies
DROP POLICY IF EXISTS "Direction can insert settings" ON public.exploitation_metric_settings;
CREATE POLICY "Direction can insert settings"
ON public.exploitation_metric_settings
FOR INSERT
TO authenticated
WITH CHECK (
  license_id IN (
    SELECT cu.license_id FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
      AND cu.role = ANY (ARRAY['direction'::text, 'owner'::text])
  )
);

DROP POLICY IF EXISTS "Direction can update settings" ON public.exploitation_metric_settings;
CREATE POLICY "Direction can update settings"
ON public.exploitation_metric_settings
FOR UPDATE
TO authenticated
USING (
  license_id IN (
    SELECT cu.license_id FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
      AND cu.role = ANY (ARRAY['direction'::text, 'owner'::text])
  )
);

DROP POLICY IF EXISTS "Direction can view settings" ON public.exploitation_metric_settings;
CREATE POLICY "Direction can view settings"
ON public.exploitation_metric_settings
FOR SELECT
TO authenticated
USING (
  license_id IN (
    SELECT cu.license_id FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
      AND cu.role = ANY (ARRAY['direction'::text, 'owner'::text])
  )
);

DROP POLICY IF EXISTS "Exploitation can view settings" ON public.exploitation_metric_settings;
CREATE POLICY "Exploitation can view settings"
ON public.exploitation_metric_settings
FOR SELECT
TO authenticated
USING (
  license_id IN (
    SELECT cu.license_id FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.is_active = true
  )
);

-- 6. Tighten access_requests {public} policies
DROP POLICY IF EXISTS "Direction and responsable can view all requests" ON public.access_requests;
CREATE POLICY "Direction and responsable can view all requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  license_id IN (
    SELECT company_users.license_id FROM company_users
    WHERE company_users.user_id = auth.uid()
      AND company_users.role = ANY (ARRAY['direction'::text, 'responsable'::text])
  )
);

DROP POLICY IF EXISTS "Users can create their own requests" ON public.access_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.access_requests;
CREATE POLICY "Users can view their own requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  company_user_id IN (
    SELECT company_users.id FROM company_users
    WHERE company_users.user_id = auth.uid()
  )
);

-- 7. Tighten company_sync_events {public} SELECT
DROP POLICY IF EXISTS "Company members can view sync events" ON public.company_sync_events;
CREATE POLICY "Company members can view sync events"
ON public.company_sync_events
FOR SELECT
TO authenticated
USING (license_id = get_user_license_id(auth.uid()));
