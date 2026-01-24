-- Update the licenses RLS policy to also allow company members to view their license
DROP POLICY IF EXISTS "Authenticated users can view own license only" ON public.licenses;

CREATE POLICY "Authenticated users can view own license only"
ON public.licenses
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Original: license owner by email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    -- NEW: company members can also view
    OR id IN (
      SELECT license_id 
      FROM company_users 
      WHERE user_id = auth.uid() 
        AND is_active = true 
        AND license_id IS NOT NULL
    )
  )
);