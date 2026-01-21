-- Drop existing SELECT/UPDATE/DELETE policies for clients
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete company clients" ON public.clients;

-- Create new restrictive policies:

-- 1. Users can view their own clients
CREATE POLICY "Users can view their own clients"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admins/owners can view all company clients
CREATE POLICY "Admins can view all company clients"
ON public.clients
FOR SELECT
USING (
  license_id IS NOT NULL 
  AND license_id IN (
    SELECT cu.license_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true 
      AND cu.role IN ('owner', 'admin')
  )
);

-- 3. Users can update their own clients
CREATE POLICY "Users can update their own clients"
ON public.clients
FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Admins/owners can update all company clients
CREATE POLICY "Admins can update all company clients"
ON public.clients
FOR UPDATE
USING (
  license_id IS NOT NULL 
  AND license_id IN (
    SELECT cu.license_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true 
      AND cu.role IN ('owner', 'admin')
  )
);

-- 5. Users can delete their own clients
CREATE POLICY "Users can delete their own clients"
ON public.clients
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Admins/owners can delete all company clients
CREATE POLICY "Admins can delete all company clients"
ON public.clients
FOR DELETE
USING (
  license_id IS NOT NULL 
  AND license_id IN (
    SELECT cu.license_id 
    FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true 
      AND cu.role IN ('owner', 'admin')
  )
);