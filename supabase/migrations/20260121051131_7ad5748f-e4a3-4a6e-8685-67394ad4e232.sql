-- Add license_id column to company_settings for multi-user access
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES public.licenses(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_company_settings_license_id ON public.company_settings(license_id);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can create their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;

-- Create new multi-user policies:

-- 1. Users can view their own settings OR company settings (via license_id)
CREATE POLICY "Users can view company settings"
ON public.company_settings
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

-- 2. Users can create their own settings
CREATE POLICY "Users can create their own company settings"
ON public.company_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own settings OR admins/owners can update company settings
CREATE POLICY "Users and admins can update company settings"
ON public.company_settings
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
        AND cu.role IN ('owner', 'admin')
    )
  )
);

-- 4. Only creator or admin can delete settings
CREATE POLICY "Users and admins can delete company settings"
ON public.company_settings
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
        AND cu.role IN ('owner', 'admin')
    )
  )
);