
-- Update the prevent_role_escalation trigger to allow admin functions
-- by checking for a session variable set by admin functions

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow if called from an admin context (set by admin functions)
  IF current_setting('app.admin_context', true) = 'true' THEN
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
$function$;

-- Update admin_add_company_user to set admin context
CREATE OR REPLACE FUNCTION public.admin_add_company_user(
  p_license_id uuid, 
  p_email text, 
  p_role text DEFAULT 'member'::text, 
  p_display_name text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id UUID;
BEGIN
  -- Set admin context to bypass role escalation trigger
  PERFORM set_config('app.admin_context', 'true', true);
  
  -- Insert the new user
  INSERT INTO public.company_users (
    license_id,
    email,
    role,
    display_name,
    user_id,
    is_active,
    invited_at
  ) VALUES (
    p_license_id,
    LOWER(TRIM(p_email)),
    p_role,
    NULLIF(TRIM(p_display_name), ''),
    NULL,
    true,
    NOW()
  )
  RETURNING id INTO v_new_id;
  
  -- Reset admin context
  PERFORM set_config('app.admin_context', 'false', true);
  
  RETURN v_new_id;
END;
$function$;

-- Update admin_update_company_user_role to set admin context
CREATE OR REPLACE FUNCTION public.admin_update_company_user_role(p_user_id uuid, p_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set admin context to bypass role escalation trigger
  PERFORM set_config('app.admin_context', 'true', true);
  
  UPDATE public.company_users 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id AND role <> 'owner';
  
  -- Reset admin context
  PERFORM set_config('app.admin_context', 'false', true);
  
  RETURN FOUND;
END;
$function$;
