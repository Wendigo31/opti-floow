-- Drop and recreate the licenses RLS policy with better clarity
DROP POLICY IF EXISTS "Authenticated users can view own license only" ON public.licenses;

CREATE POLICY "Authenticated users can view own license only"
ON public.licenses
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- License owner by email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    -- OR: company members can also view their license
    OR EXISTS (
      SELECT 1 
      FROM company_users cu
      WHERE cu.license_id = licenses.id
        AND cu.user_id = auth.uid() 
        AND cu.is_active = true
    )
  )
);