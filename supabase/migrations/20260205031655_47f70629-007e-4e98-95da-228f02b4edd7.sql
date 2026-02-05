
-- Improve auto_link_company_user function to be more robust
CREATE OR REPLACE FUNCTION public.auto_link_company_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending_user_id uuid;
  v_email text;
BEGIN
  -- Set admin context to bypass role escalation trigger
  PERFORM set_config('app.admin_context', 'true', true);
  
  -- Normalize email (lowercase, trim)
  v_email := LOWER(TRIM(NEW.email));
  
  -- Check if there's a pending company_user with matching email and no real user_id
  -- or user_id that doesn't match the current user (for re-linking)
  UPDATE public.company_users
  SET 
    user_id = NEW.id,
    accepted_at = COALESCE(accepted_at, now()),
    updated_at = now()
  WHERE 
    LOWER(TRIM(email)) = v_email
    AND (user_id IS NULL OR user_id != NEW.id)
  RETURNING id INTO v_pending_user_id;
  
  IF v_pending_user_id IS NOT NULL THEN
    RAISE LOG 'Auto-linked user % (email: %) to company_users record %', NEW.id, v_email, v_pending_user_id;
  END IF;
  
  -- Reset admin context
  PERFORM set_config('app.admin_context', 'false', true);
  
  RETURN NEW;
END;
$function$;

-- Make sure triggers exist for both INSERT and UPDATE (email confirmation)
DROP TRIGGER IF EXISTS on_auth_user_created_link_company ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated_link_company ON auth.users;

CREATE TRIGGER on_auth_user_created_link_company
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_company_user();

CREATE TRIGGER on_auth_user_updated_link_company
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.auto_link_company_user();

-- Also add a trigger for login events (last_sign_in_at update)
DROP TRIGGER IF EXISTS on_auth_user_login_link_company ON auth.users;

CREATE TRIGGER on_auth_user_login_link_company
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.auto_link_company_user();
