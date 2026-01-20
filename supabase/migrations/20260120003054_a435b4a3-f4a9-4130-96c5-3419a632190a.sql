-- Fix security issues for license_addons and process_access_request

-- 1. Add explicit deny policies for license_addons write operations
-- This ensures no client-side write access is possible

CREATE POLICY "No public write to license_addons" 
ON public.license_addons 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No public update to license_addons" 
ON public.license_addons 
FOR UPDATE 
USING (false);

CREATE POLICY "No public delete from license_addons" 
ON public.license_addons 
FOR DELETE 
USING (false);

-- 2. Fix process_access_request RPC function
-- Revoke PUBLIC access and add admin authorization check

REVOKE ALL ON FUNCTION public.process_access_request FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_access_request FROM anon;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.process_access_request TO authenticated;

-- Recreate the function with admin authorization check
CREATE OR REPLACE FUNCTION public.process_access_request(
  p_request_id UUID,
  p_status TEXT,
  p_comment TEXT DEFAULT NULL,
  p_processed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Get the license_id from the access request
  SELECT license_id INTO v_license_id
  FROM public.access_requests 
  WHERE id = p_request_id;
  
  IF v_license_id IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;
  
  -- Verify caller is owner or admin of the company
  SELECT role INTO v_caller_role
  FROM public.company_users
  WHERE user_id = auth.uid()
    AND license_id = v_license_id
    AND is_active = true
    AND role IN ('owner', 'admin');
  
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only company owners or admins can process access requests';
  END IF;

  -- Process the request
  UPDATE public.access_requests
  SET 
    status = p_status,
    admin_comment = p_comment,
    processed_by = COALESCE(p_processed_by, (SELECT email FROM auth.users WHERE id = auth.uid())),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$$;