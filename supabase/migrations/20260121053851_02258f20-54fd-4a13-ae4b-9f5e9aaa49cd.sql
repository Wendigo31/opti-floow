-- Tighten service-role RLS policies to avoid USING/WITH CHECK = true
-- This keeps intended server-only access while satisfying security linter.

-- access_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='access_requests' AND policyname='Service role full access'
  ) THEN
    DROP POLICY "Service role full access" ON public.access_requests;
  END IF;

  CREATE POLICY "Service role full access"
  ON public.access_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
END $$;

-- company_users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='company_users' AND policyname='Service role full access company_users'
  ) THEN
    DROP POLICY "Service role full access company_users" ON public.company_users;
  END IF;

  CREATE POLICY "Service role full access company_users"
  ON public.company_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
END $$;

-- user_feature_overrides (dedupe + tighten)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_feature_overrides' AND policyname='Service role can manage all overrides'
  ) THEN
    DROP POLICY "Service role can manage all overrides" ON public.user_feature_overrides;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_feature_overrides' AND policyname='Service role has full access to user_feature_overrides'
  ) THEN
    DROP POLICY "Service role has full access to user_feature_overrides" ON public.user_feature_overrides;
  END IF;

  CREATE POLICY "Service role full access"
  ON public.user_feature_overrides
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
END $$;