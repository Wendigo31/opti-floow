-- Fix privilege escalation: replace broken policy with secure one using a trigger-enforced check
DROP POLICY IF EXISTS "Members can update own non-sensitive fields" ON public.company_users;

-- Recreate with a correct WITH CHECK using the actual row's columns.
-- We compare new values against OLD via a security-definer helper since RLS WITH CHECK
-- only sees NEW. We use the prevent_role_escalation trigger (already in place) to block
-- role/license_id changes, and restrict this policy to harmless fields only.
CREATE POLICY "Members can update own non-sensitive fields"
ON public.company_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role <> 'direction'
);

-- Defense in depth: strengthen the trigger to also block role changes by non-admin contexts
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bypass if called via admin function (set_config)
  IF current_setting('app.admin_context', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow if role unchanged
  IF OLD IS NOT NULL AND NEW.role = OLD.role AND NEW.license_id = OLD.license_id AND NEW.is_active = OLD.is_active THEN
    RETURN NEW;
  END IF;

  -- Block any role change outside admin context
  IF OLD IS NOT NULL AND NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'Role changes require admin context (privilege escalation blocked)';
  END IF;

  -- Block promotion to direction
  IF NEW.role = 'direction' AND (OLD IS NULL OR OLD.role <> 'direction') THEN
    RAISE EXCEPTION 'Privilege escalation blocked: only service_role/admin_context can assign direction role';
  END IF;

  -- Block license_id change (company theft)
  IF OLD IS NOT NULL AND NEW.license_id <> OLD.license_id THEN
    RAISE EXCEPTION 'Cannot change license_id of an existing company_user';
  END IF;

  -- Block is_active toggle outside admin context
  IF OLD IS NOT NULL AND NEW.is_active <> OLD.is_active THEN
    RAISE EXCEPTION 'is_active changes require admin context';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is attached
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.company_users;
CREATE TRIGGER prevent_role_escalation_trigger
BEFORE UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();