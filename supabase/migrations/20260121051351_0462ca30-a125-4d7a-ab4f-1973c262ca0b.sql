-- Revert clients policies to company-wide access
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update all company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete all company clients" ON public.clients;

-- Restore company-wide access for all members
CREATE POLICY "Users can view company clients"
ON public.clients
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.is_active = true
    )
  )
);

CREATE POLICY "Users can update company clients"
ON public.clients
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.is_active = true
    )
  )
);

CREATE POLICY "Users can delete company clients"
ON public.clients
FOR DELETE
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() 
        AND cu.is_active = true
    )
  )
);