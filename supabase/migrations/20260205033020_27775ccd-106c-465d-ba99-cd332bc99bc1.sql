
-- Direction-only driver deletion (server-verified)
CREATE OR REPLACE FUNCTION public.delete_company_driver(p_license_id uuid, p_local_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only Direction can delete drivers for the company
  IF NOT public.is_company_owner(p_license_id, auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.user_drivers
  WHERE license_id = p_license_id
    AND local_id = p_local_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_company_driver(uuid, text) TO authenticated;
