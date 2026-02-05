-- Fix: Update the prevent_role_escalation trigger to allow linking user_id
-- The trigger should only block role changes, not user_id linking

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow if called from an admin context (set by admin functions)
  IF current_setting('app.admin_context', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow linking user_id without role change
  IF OLD IS NOT NULL AND NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

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

-- Now link the users to their company_users records
-- Using a function that sets admin context
CREATE OR REPLACE FUNCTION public.admin_link_users_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set admin context to bypass role escalation trigger
  PERFORM set_config('app.admin_context', 'true', true);
  
  -- Link y.dini@jardel.eu
  UPDATE public.company_users 
  SET user_id = 'bd6b0055-575f-435d-ae8e-5f37d68541a5', 
      accepted_at = COALESCE(accepted_at, NOW()), 
      updated_at = NOW()
  WHERE email = 'y.dini@jardel.eu' AND (user_id IS NULL OR user_id != 'bd6b0055-575f-435d-ae8e-5f37d68541a5');
  
  -- Link j.lemesle@jardel.eu
  UPDATE public.company_users 
  SET user_id = '4bcd20cf-b48f-46e1-b31f-2a1ef399ed08', 
      accepted_at = COALESCE(accepted_at, NOW()), 
      updated_at = NOW()
  WHERE email = 'j.lemesle@jardel.eu' AND (user_id IS NULL OR user_id != '4bcd20cf-b48f-46e1-b31f-2a1ef399ed08');
  
  -- Reset admin context
  PERFORM set_config('app.admin_context', 'false', true);
END;
$$;

-- Execute the linking
SELECT public.admin_link_users_batch();

-- Clean up the temporary function
DROP FUNCTION IF EXISTS public.admin_link_users_batch();