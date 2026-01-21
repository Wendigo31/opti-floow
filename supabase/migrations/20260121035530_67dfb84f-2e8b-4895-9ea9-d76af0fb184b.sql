-- Create RPC function to toggle company user active status (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_company_user_active(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get the user's role to prevent toggling owner
  SELECT role INTO v_user_role
  FROM company_users
  WHERE id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
  
  IF v_user_role = 'owner' THEN
    RAISE EXCEPTION 'Impossible de désactiver le propriétaire';
  END IF;
  
  -- Update the user's active status
  UPDATE company_users
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;