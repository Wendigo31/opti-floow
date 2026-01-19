-- Create a function to add company users that bypasses RLS (for admin use)
CREATE OR REPLACE FUNCTION public.admin_add_company_user(
  p_license_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member',
  p_display_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
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
    NULL, -- Will be auto-linked when user logs in
    true,
    NOW()
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Grant execute to authenticated and anon (will be called from admin panel)
GRANT EXECUTE ON FUNCTION public.admin_add_company_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_company_user TO anon;

-- Also create function to remove company users
CREATE OR REPLACE FUNCTION public.admin_remove_company_user(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check if user is owner (can't be removed)
  SELECT role INTO v_role FROM public.company_users WHERE id = p_user_id;
  
  IF v_role = 'owner' THEN
    RETURN FALSE;
  END IF;
  
  DELETE FROM public.company_users WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_company_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_company_user TO anon;

-- Create function to update company user role
CREATE OR REPLACE FUNCTION public.admin_update_company_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_users 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id AND role <> 'owner'; -- Can't change owner role
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_company_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_company_user_role TO anon;