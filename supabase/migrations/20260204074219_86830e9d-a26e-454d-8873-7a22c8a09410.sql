-- ============================================================
-- PHASE 1: Sécurisation des Fonctions RPC Admin
-- Révoquer accès PUBLIC et accorder uniquement au service_role
-- ============================================================

-- Révoquer les permissions PUBLIC sur les fonctions admin
REVOKE ALL ON FUNCTION public.admin_add_company_user FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_company_user FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_company_user_role FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_company_user_active FROM PUBLIC;

-- Accorder uniquement au service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.admin_add_company_user TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_company_user TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_company_user_role TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_company_user_active TO service_role;

-- ============================================================
-- PHASE 2: Correction des Policies INSERT "WIDE OPEN"
-- Ajouter vérification auth.uid() à toutes les INSERT policies
-- ============================================================

-- access_requests
DROP POLICY IF EXISTS "Users can create access requests" ON public.access_requests;
CREATE POLICY "Users can create access requests"
ON public.access_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_user_id IN (
    SELECT id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- charge_presets
DROP POLICY IF EXISTS "Company members can create charge presets" ON public.charge_presets;
CREATE POLICY "Company members can create charge presets"
ON public.charge_presets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND (
    license_id IS NULL
    OR license_id = public.get_user_license_id(auth.uid())
  )
);

-- company_config
DROP POLICY IF EXISTS "Company admins can create config" ON public.company_config;
CREATE POLICY "Company admins can create config"
ON public.company_config
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND updated_by = auth.uid()
  AND license_id = public.get_user_license_id(auth.uid())
  AND public.is_company_admin(license_id, auth.uid())
);

-- company_sync_events
DROP POLICY IF EXISTS "Company members can create sync events" ON public.company_sync_events;
CREATE POLICY "Company members can create sync events"
ON public.company_sync_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND license_id = public.get_user_license_id(auth.uid())
);

-- company_users - améliorer pour empêcher auto-élévation
DROP POLICY IF EXISTS "Direction and responsable can invite members" ON public.company_users;
CREATE POLICY "Direction and responsable can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Soit l'utilisateur est admin de la licence
    public.is_company_admin(license_id, auth.uid())
    -- Soit c'est le premier utilisateur de la licence (création initiale)
    OR NOT public.license_has_members(license_id)
  )
);

-- exploitation_metric_settings
DROP POLICY IF EXISTS "Company admins can create metric settings" ON public.exploitation_metric_settings;
CREATE POLICY "Company admins can create metric settings"
ON public.exploitation_metric_settings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND license_id = public.get_user_license_id(auth.uid())
  AND public.is_company_owner(license_id, auth.uid())
);

-- user_charges
DROP POLICY IF EXISTS "Users can insert own charges" ON public.user_charges;
CREATE POLICY "Users can insert own charges"
ON public.user_charges
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND (
    license_id IS NULL
    OR license_id = public.get_user_license_id(auth.uid())
  )
);

-- user_drivers
DROP POLICY IF EXISTS "Users can insert own drivers" ON public.user_drivers;
CREATE POLICY "Users can insert own drivers"
ON public.user_drivers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND (
    license_id IS NULL
    OR license_id = public.get_user_license_id(auth.uid())
  )
);

-- ============================================================
-- PHASE 4: Trigger de prévention d'élévation de privilèges
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empêcher la création/modification d'un rôle 'direction' par un utilisateur normal
  IF NEW.role = 'direction' AND current_setting('role', true) != 'service_role' THEN
    -- Vérifier si c'est le premier utilisateur (création initiale autorisée)
    IF EXISTS (
      SELECT 1 FROM company_users 
      WHERE license_id = NEW.license_id 
      AND role = 'direction'
      AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Seul le service_role peut créer des utilisateurs direction';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_role_escalation ON public.company_users;
CREATE TRIGGER check_role_escalation
BEFORE INSERT OR UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================
-- PHASE 5: Trigger de logging pour les opérations sensibles
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_sensitive_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_audit_log (
    admin_email,
    action,
    target_id,
    details,
    ip_address
  ) VALUES (
    COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'system'
    ),
    TG_OP || '_' || TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'old', CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    ),
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_company_users ON public.company_users;
CREATE TRIGGER audit_company_users
AFTER INSERT OR UPDATE OR DELETE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.log_sensitive_action();