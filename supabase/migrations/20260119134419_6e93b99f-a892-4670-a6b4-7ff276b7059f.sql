-- 1. Create table for user-specific feature overrides
CREATE TABLE public.user_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_user_id UUID NOT NULL REFERENCES public.company_users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_user_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for user_feature_overrides
CREATE POLICY "Service role can manage all overrides"
ON public.user_feature_overrides
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own overrides"
ON public.user_feature_overrides
FOR SELECT
USING (
  company_user_id IN (
    SELECT id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage overrides"
ON public.user_feature_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.company_users target ON target.id = user_feature_overrides.company_user_id
    WHERE cu.user_id = auth.uid()
      AND cu.license_id = target.license_id
      AND cu.role IN ('owner', 'admin')
      AND cu.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.company_users target ON target.id = user_feature_overrides.company_user_id
    WHERE cu.user_id = auth.uid()
      AND cu.license_id = target.license_id
      AND cu.role IN ('owner', 'admin')
      AND cu.is_active = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_user_feature_overrides_company_user 
ON public.user_feature_overrides(company_user_id);

-- 2. Fix the link_user_to_company function to be more robust
DROP FUNCTION IF EXISTS public.link_user_to_company(uuid, uuid);

CREATE OR REPLACE FUNCTION public.link_user_to_company(
  p_company_user_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  -- Update the company_users record with the real Supabase user_id
  UPDATE public.company_users
  SET 
    user_id = p_user_id,
    accepted_at = COALESCE(accepted_at, NOW()),
    is_active = true,
    updated_at = NOW()
  WHERE id = p_company_user_id;
  
  v_updated := FOUND;
  RETURN v_updated;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid) TO authenticated;