-- Add license_id column to clients table for company-wide sharing
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_license_id ON public.clients(license_id);

-- Add license_id column to quotes table for company-wide sharing
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_license_id ON public.quotes(license_id);

-- Add license_id column to trips table for company-wide sharing
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_license_id ON public.trips(license_id);

-- Update RLS policies for clients to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view company clients" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
CREATE POLICY "Users can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update company clients" 
ON public.clients 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for quotes to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view company quotes" 
ON public.quotes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
CREATE POLICY "Users can create quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
CREATE POLICY "Users can update company quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
CREATE POLICY "Users can delete own quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for trips to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
CREATE POLICY "Users can view company trips" 
ON public.trips 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
CREATE POLICY "Users can create trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
CREATE POLICY "Users can update company trips" 
ON public.trips 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;
CREATE POLICY "Users can delete own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update RLS policies for saved_tours to allow company-wide access (already has license_id)
DROP POLICY IF EXISTS "Users can view their own saved tours" ON public.saved_tours;
CREATE POLICY "Users can view company saved tours" 
ON public.saved_tours 
FOR SELECT 
USING (
  auth.uid()::text = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can create saved tours" ON public.saved_tours;
CREATE POLICY "Users can create saved tours" 
ON public.saved_tours 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own saved tours" ON public.saved_tours;
CREATE POLICY "Users can update company saved tours" 
ON public.saved_tours 
FOR UPDATE 
USING (
  auth.uid()::text = user_id 
  OR (
    license_id IS NOT NULL 
    AND license_id IN (
      SELECT cu.license_id FROM public.company_users cu 
      WHERE cu.user_id = auth.uid() AND cu.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their own saved tours" ON public.saved_tours;
CREATE POLICY "Users can delete own saved tours" 
ON public.saved_tours 
FOR DELETE 
USING (auth.uid()::text = user_id);