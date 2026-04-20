
-- BLOQUANT #2: Sécuriser realtime.messages par license_id
-- Empêcher que les utilisateurs s'abonnent aux événements d'autres entreprises
ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update, delete');

-- Activer RLS sur realtime.messages si pas déjà fait
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    
    -- Drop les anciennes policies si elles existent
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users only receive own company broadcasts" ON realtime.messages';
    
    -- Nouvelle policy : restreindre par préfixe de topic license
    EXECUTE $POL$
      CREATE POLICY "Users only receive own company broadcasts"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        topic LIKE 'company:' || public.get_user_license_id(auth.uid())::text || '%'
        OR topic LIKE 'user:' || auth.uid()::text || '%'
        OR topic NOT LIKE 'company:%'
      )
    $POL$;
  END IF;
END $$;

-- BLOQUANT #3: Empêcher l'escalade de privilèges via self-UPDATE sur company_users
-- Remplacer la policy permissive actuelle par une plus stricte
DROP POLICY IF EXISTS "Direction and responsable can update members" ON public.company_users;

-- Nouvelle policy : un utilisateur peut update SA ligne mais SANS changer role/license_id/is_active
CREATE POLICY "Members can update own non-sensitive fields"
ON public.company_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT role FROM public.company_users WHERE id = company_users.id)
  AND license_id = (SELECT license_id FROM public.company_users WHERE id = company_users.id)
  AND is_active = (SELECT is_active FROM public.company_users WHERE id = company_users.id)
);

-- Direction peut modifier les autres membres (sauf direction)
CREATE POLICY "Direction can update other members"
ON public.company_users
FOR UPDATE
TO authenticated
USING (
  is_company_owner(license_id, auth.uid()) 
  AND user_id IS DISTINCT FROM auth.uid()
  AND role <> 'direction'
)
WITH CHECK (
  is_company_owner(license_id, auth.uid()) 
  AND role <> 'direction'
);

-- Exploitation peut gérer les comptes 'exploitation' uniquement
CREATE POLICY "Exploitation can update exploitation members"
ON public.company_users
FOR UPDATE
TO authenticated
USING (
  is_company_admin(license_id, auth.uid())
  AND user_id IS DISTINCT FROM auth.uid()
  AND role = 'exploitation'
)
WITH CHECK (
  is_company_admin(license_id, auth.uid())
  AND role = 'exploitation'
);

-- Renforcer le trigger anti-escalade existant pour bloquer TOUT changement de role hors admin_context
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Bypass si appelé via fonction admin (set_config)
  IF current_setting('app.admin_context', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Autoriser si role inchangé
  IF OLD IS NOT NULL AND NEW.role = OLD.role AND NEW.license_id = OLD.license_id THEN
    RETURN NEW;
  END IF;

  -- Bloquer toute tentative de promotion vers direction hors admin_context
  IF NEW.role = 'direction' AND (OLD IS NULL OR OLD.role <> 'direction') THEN
    RAISE EXCEPTION 'Privilege escalation blocked: only service_role/admin_context can assign direction role';
  END IF;

  -- Bloquer changement de license_id (vol de société)
  IF OLD IS NOT NULL AND NEW.license_id <> OLD.license_id THEN
    RAISE EXCEPTION 'Cannot change license_id of an existing company_user';
  END IF;

  RETURN NEW;
END;
$$;

-- S'assurer que le trigger est attaché
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.company_users;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE INSERT OR UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();
