-- Fix the auto_link_company_user function to bypass role escalation checks
CREATE OR REPLACE FUNCTION public.auto_link_company_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pending_user_id uuid;
BEGIN
  -- Set admin context to bypass role escalation trigger
  PERFORM set_config('app.admin_context', 'true', true);
  
  -- Check if there's a pending company_user with matching email and no real user_id
  UPDATE public.company_users
  SET 
    user_id = NEW.id,
    accepted_at = COALESCE(accepted_at, now()),
    updated_at = now()
  WHERE 
    email = LOWER(NEW.email)
    AND (user_id IS NULL OR user_id != NEW.id)
  RETURNING id INTO v_pending_user_id;
  
  IF v_pending_user_id IS NOT NULL THEN
    RAISE LOG 'Auto-linked user % to company_users record %', NEW.id, v_pending_user_id;
  END IF;
  
  -- Reset admin context
  PERFORM set_config('app.admin_context', 'false', true);
  
  RETURN NEW;
END;
$$;