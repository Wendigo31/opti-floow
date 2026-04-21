DROP POLICY IF EXISTS "Members can update own non-sensitive fields" ON public.company_users;

CREATE POLICY "Members can update own non-sensitive fields"
ON public.company_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT cu.role FROM public.company_users cu WHERE cu.id = company_users.id)
  AND license_id = (SELECT cu.license_id FROM public.company_users cu WHERE cu.id = company_users.id)
  AND is_active = (SELECT cu.is_active FROM public.company_users cu WHERE cu.id = company_users.id)
);