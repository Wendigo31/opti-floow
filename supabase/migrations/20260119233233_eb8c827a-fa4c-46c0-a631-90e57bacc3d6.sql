-- Supprimer la policy problématique qui référence auth.users
DROP POLICY IF EXISTS "Users can read own company membership" ON public.company_users;

-- Créer une policy plus simple pour les utilisateurs authentifiés
CREATE POLICY "Users can read own company membership" ON public.company_users
  FOR SELECT USING (
    user_id = auth.uid() 
    OR is_company_admin(license_id, auth.uid())
  );

-- Ajouter une policy séparée pour permettre aux membres de se voir par email (avant d'avoir un user_id)
CREATE POLICY "Users can read by email match" ON public.company_users
  FOR SELECT USING (
    email = LOWER(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
  );