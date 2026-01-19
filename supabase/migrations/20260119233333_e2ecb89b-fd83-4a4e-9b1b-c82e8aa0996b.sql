-- S'assurer que les policies qui accèdent à auth.users sont supprimées 
-- car elles causent des problèmes de permissions
DROP POLICY IF EXISTS "Users can read by email match" ON public.company_users;

-- Modifier la policy pour les utilisateurs normaux sans référence à auth.users
DROP POLICY IF EXISTS "Users can read own company membership" ON public.company_users;
CREATE POLICY "Users can read own company membership" ON public.company_users
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_company_admin(license_id, auth.uid())
    OR license_id = get_user_license_id(auth.uid())
  );

-- Nettoyer les policies dupliquées pour service_role
DROP POLICY IF EXISTS "Service role can view all company_users" ON public.company_users;
DROP POLICY IF EXISTS "Service role can insert company_users" ON public.company_users;
DROP POLICY IF EXISTS "Service role can update company_users" ON public.company_users;
DROP POLICY IF EXISTS "Service role can delete company_users" ON public.company_users;
DROP POLICY IF EXISTS "Service role has full access to company_users" ON public.company_users;

-- Garder une seule policy service_role
DROP POLICY IF EXISTS "Service role full access company_users" ON public.company_users;
CREATE POLICY "Service role full access company_users" ON public.company_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);