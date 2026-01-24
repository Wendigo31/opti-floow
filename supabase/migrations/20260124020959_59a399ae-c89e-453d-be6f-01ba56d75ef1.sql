-- Drop existing SELECT policy and create a more permissive one for direction/responsable
DROP POLICY IF EXISTS "Authenticated users can view relevant invitations only" ON public.company_invitations;

-- Allow direction and responsable to view all invitations for their company
CREATE POLICY "Company admins can view all invitations"
ON public.company_invitations
FOR SELECT
USING (
  license_id IN (
    SELECT cu.license_id 
    FROM company_users cu
    WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true
      AND cu.role IN ('direction', 'responsable', 'owner', 'admin')
  )
);

-- Also allow users to see invitations sent to their email
CREATE POLICY "Users can view invitations to their email"
ON public.company_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);