-- Fix DELETE policies to allow company-level deletion for trips, quotes, and clients

-- Drop existing restrictive DELETE policies
DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

-- Create new company-level DELETE policies for trips
CREATE POLICY "Users can delete company trips" 
ON public.trips 
FOR DELETE 
USING (
  (auth.uid() = user_id) 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

-- Create new company-level DELETE policies for quotes
CREATE POLICY "Users can delete company quotes" 
ON public.quotes 
FOR DELETE 
USING (
  (auth.uid() = user_id) 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

-- Create new company-level DELETE policies for clients
CREATE POLICY "Users can delete company clients" 
ON public.clients 
FOR DELETE 
USING (
  (auth.uid() = user_id) 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id 
      FROM company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);