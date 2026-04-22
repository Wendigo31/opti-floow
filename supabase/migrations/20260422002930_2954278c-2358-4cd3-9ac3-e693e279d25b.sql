-- 1. Harden company_users INSERT policy
DROP POLICY IF EXISTS "Direction can invite members" ON public.company_users;

CREATE POLICY "Direction can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND license_id = public.get_user_license_id(auth.uid())
  AND public.is_company_admin(license_id, auth.uid())
);

-- 2. Restrict user_drivers/trailers/vehicles/charges to authenticated only
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_drivers','user_trailers','user_vehicles','user_charges']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname='public' AND tablename=t AND 'public' = ANY(roles)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
        IF pol.cmd = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR %s TO authenticated WITH CHECK (%s)',
            pol.policyname, t, pol.cmd, COALESCE(pol.with_check, 'true')
          );
        ELSIF pol.cmd = 'ALL' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
            pol.policyname, t, COALESCE(pol.qual,'true'), COALESCE(pol.with_check, pol.qual, 'true')
          );
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (%s)',
            pol.policyname, t, pol.cmd, COALESCE(pol.qual, 'true')
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;