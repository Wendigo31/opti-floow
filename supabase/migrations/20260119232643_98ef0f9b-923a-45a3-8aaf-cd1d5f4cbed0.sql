-- 1. Make user_id NULLABLE in company_users to allow adding users before they log in
-- 2. Create trigger to auto-link user_id when user signs up with matching email

-- First, alter company_users to allow NULL user_id
ALTER TABLE public.company_users ALTER COLUMN user_id DROP NOT NULL;

-- Create function to auto-link user_id when auth user is created
CREATE OR REPLACE FUNCTION public.auto_link_company_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_pending_user_id uuid;
BEGIN
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
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created_link_company ON auth.users;
CREATE TRIGGER on_auth_user_created_link_company
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_company_user();

-- Also create a trigger for when user email is confirmed (in case they existed before)
DROP TRIGGER IF EXISTS on_auth_user_updated_link_company ON auth.users;
CREATE TRIGGER on_auth_user_updated_link_company
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.auto_link_company_user();

-- Update RLS policies for company_users to handle NULL user_id properly
DROP POLICY IF EXISTS "Users can read own company membership" ON public.company_users;
CREATE POLICY "Users can read own company membership" ON public.company_users
  FOR SELECT USING (
    user_id = auth.uid() 
    OR email = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR is_company_admin(license_id, auth.uid())
  );

-- Allow service role full access (for edge functions and admin operations)
DROP POLICY IF EXISTS "Service role has full access to company_users" ON public.company_users;
CREATE POLICY "Service role has full access to company_users" ON public.company_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);