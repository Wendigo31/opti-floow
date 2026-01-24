-- Update RLS policy for user_feature_overrides to allow Direction role
-- First drop the existing policy and recreate with correct roles

DROP POLICY IF EXISTS "Company admins can manage overrides" ON public.user_feature_overrides;

CREATE POLICY "Direction and responsable can manage overrides" 
ON public.user_feature_overrides 
FOR ALL
USING (EXISTS (
  SELECT 1
  FROM company_users cu
  JOIN company_users target ON target.id = user_feature_overrides.company_user_id
  WHERE cu.user_id = auth.uid()
    AND cu.license_id = target.license_id
    AND cu.role IN ('direction', 'owner', 'responsable', 'admin')
    AND cu.is_active = true
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM company_users cu
  JOIN company_users target ON target.id = user_feature_overrides.company_user_id
  WHERE cu.user_id = auth.uid()
    AND cu.license_id = target.license_id
    AND cu.role IN ('direction', 'owner', 'responsable', 'admin')
    AND cu.is_active = true
));