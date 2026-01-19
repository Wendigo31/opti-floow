-- Ajouter des policies explicites pour service_role sur user_feature_overrides
DROP POLICY IF EXISTS "Service role has full access to user_feature_overrides" ON public.user_feature_overrides;
CREATE POLICY "Service role has full access to user_feature_overrides" ON public.user_feature_overrides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- S'assurer que les policies company_users pour service_role sont bien en place
DROP POLICY IF EXISTS "Service role full access company_users" ON public.company_users;
CREATE POLICY "Service role full access company_users" ON public.company_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);