-- Update RLS policies that reference old roles to use new roles

-- company_users policies
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.company_users;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.company_users;
DROP POLICY IF EXISTS "Owners can delete members" ON public.company_users;

CREATE POLICY "Direction and responsable can invite members"
ON public.company_users
FOR INSERT
WITH CHECK (is_company_admin(license_id, auth.uid()) OR (NOT license_has_members(license_id)));

CREATE POLICY "Direction and responsable can update members"
ON public.company_users
FOR UPDATE
USING (
  (is_company_owner(license_id, auth.uid()) AND role <> 'direction')
  OR (is_company_admin(license_id, auth.uid()) AND role = 'exploitation')
  OR (user_id = auth.uid())
);

CREATE POLICY "Direction can delete members"
ON public.company_users
FOR DELETE
USING (is_company_owner(license_id, auth.uid()) AND role <> 'direction');

-- company_invitations policies  
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owners and admins can delete invitations" ON public.company_invitations;

CREATE POLICY "Direction and responsable can create invitations"
ON public.company_invitations
FOR INSERT
WITH CHECK (is_company_admin(license_id, auth.uid()));

CREATE POLICY "Direction and responsable can delete invitations"
ON public.company_invitations
FOR DELETE
USING (is_company_admin(license_id, auth.uid()));

-- access_requests policies
DROP POLICY IF EXISTS "Admins can view all requests for their company" ON public.access_requests;

CREATE POLICY "Direction and responsable can view all requests"
ON public.access_requests
FOR SELECT
USING (
  license_id IN (
    SELECT company_users.license_id
    FROM company_users
    WHERE company_users.user_id = auth.uid() 
      AND company_users.role IN ('direction', 'responsable')
  )
);

-- Update process_access_request function to use new roles
CREATE OR REPLACE FUNCTION public.process_access_request(
  p_request_id uuid, 
  p_status text, 
  p_comment text DEFAULT NULL, 
  p_processed_by text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT license_id INTO v_license_id
  FROM public.access_requests 
  WHERE id = p_request_id;
  
  IF v_license_id IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;
  
  -- Verify caller is direction or responsable
  SELECT role INTO v_caller_role
  FROM public.company_users
  WHERE user_id = auth.uid()
    AND license_id = v_license_id
    AND is_active = true
    AND role IN ('direction', 'responsable');
  
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only direction or responsable can process access requests';
  END IF;

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