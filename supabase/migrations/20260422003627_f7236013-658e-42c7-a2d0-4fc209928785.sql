-- Drop redundant overly-broad ALL policies (already covered by per-op authenticated policies)
DROP POLICY IF EXISTS "Company members can manage drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can manage trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can manage vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can manage charges" ON public.user_charges;

-- Drop redundant permissive INSERT policies
DROP POLICY IF EXISTS "Users can create their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can insert own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can create their own trailers" ON public.user_trailers;

-- Harden company_users INSERT: only allow inserting into caller's own license
DROP POLICY IF EXISTS "Direction can invite members" ON public.company_users;

CREATE POLICY "Direction can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND license_id = public.get_user_license_id(auth.uid())
  AND public.is_company_admin(public.get_user_license_id(auth.uid()), auth.uid())
);