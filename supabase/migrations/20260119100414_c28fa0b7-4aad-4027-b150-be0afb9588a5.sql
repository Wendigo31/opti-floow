-- Add license_id column to user_vehicles, user_drivers, user_charges for company-level sharing
-- Keep user_id for backward compatibility and to track who created/modified

-- 1. Add license_id to user_vehicles
ALTER TABLE public.user_vehicles 
ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_vehicles_license_id ON public.user_vehicles(license_id);

-- 2. Add license_id to user_drivers  
ALTER TABLE public.user_drivers
ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_drivers_license_id ON public.user_drivers(license_id);

-- 3. Add license_id to user_charges
ALTER TABLE public.user_charges
ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_charges_license_id ON public.user_charges(license_id);

-- 4. Update RLS policies for user_vehicles to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.user_vehicles;

CREATE POLICY "Company members can view vehicles"
ON public.user_vehicles FOR SELECT
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can insert vehicles"
ON public.user_vehicles FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can update vehicles"
ON public.user_vehicles FOR UPDATE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can delete vehicles"
ON public.user_vehicles FOR DELETE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 5. Update RLS policies for user_drivers to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can insert their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can update their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can delete their own drivers" ON public.user_drivers;

CREATE POLICY "Company members can view drivers"
ON public.user_drivers FOR SELECT
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can insert drivers"
ON public.user_drivers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can update drivers"
ON public.user_drivers FOR UPDATE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can delete drivers"
ON public.user_drivers FOR DELETE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 6. Update RLS policies for user_charges to allow company-wide access
DROP POLICY IF EXISTS "Users can view their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can insert their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can update their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can delete their own charges" ON public.user_charges;

CREATE POLICY "Company members can view charges"
ON public.user_charges FOR SELECT
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can insert charges"
ON public.user_charges FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can update charges"
ON public.user_charges FOR UPDATE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can delete charges"
ON public.user_charges FOR DELETE
USING (
  user_id = auth.uid()
  OR license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);