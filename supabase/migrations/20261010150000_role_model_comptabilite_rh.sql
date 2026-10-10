-- =====================================================================
-- Modèle de rôles v2 : Direction / Exploitation / Comptabilité / RH
-- =====================================================================
-- Remplace le rôle générique « membre » par deux rôles métier réels
-- (Comptabilité, RH), et corrige deux bugs réels trouvés en auditant le
-- système actuel :
--
--   1. is_company_admin() traite Exploitation comme équivalent à
--      Direction pour la gestion d'équipe (INSERT sur company_users) :
--      un compte Exploitation pouvait donc ajouter des membres via un
--      appel direct à l'API Supabase, malgré l'absence du bouton
--      correspondant dans l'interface. On introduit is_company_rh()
--      (Direction + RH) et on l'utilise à la place pour cette policy —
--      ce qui corrige le bug ET ajoute la nouvelle capacité demandée
--      (la RH peut aussi créer de nouveaux accès).
--
--   2. prevent_role_escalation() (trigger BEFORE UPDATE sur
--      company_users) bloquait EN FAIT tout changement de rôle hors du
--      contexte interne admin_context — y compris un changement fait
--      légitimement par la Direction depuis la page Équipe de
--      l'application elle-même (qui ne passe pas par l'outil interne).
--      Résultat concret : « changer le rôle d'un membre » depuis
--      l'application ne fonctionnait dans AUCUN cas, pas seulement pour
--      l'auto-promotion qu'elle est censée bloquer. On corrige le
--      déclencheur pour n'autoriser que : Direction authentifiée, sur la
--      fiche d'un AUTRE membre (jamais la sienne), jamais vers le rôle
--      'direction' par ce chemin — en revérifiant le rôle de l'auteur en
--      base plutôt qu'en faisant confiance à app.admin_context.
--
-- On comble aussi deux trous RLS repérés à l'audit, avec des policies
-- RESTRICTIVE (qui s'ajoutent en ET aux policies permissives existantes,
-- sans avoir besoin de connaître leur nom exact ni de les toucher) :
--
--   3. driver_absences (arrêts maladie/accident des conducteurs) n'avait
--      aucune vérification de rôle : n'importe quel membre de la société
--      pouvait lire/modifier/supprimer l'arrêt d'un collègue. Restreint
--      désormais à Direction + RH.
--
--   4. user_charges / charge_presets n'avaient aucune vérification de
--      rôle : accessibles à tout membre de la société, y compris
--      Exploitation — alors que la page Charges elle-même est déjà
--      réservée à Direction (et, après cette migration, Comptabilité).
--      Restreint désormais à Direction + Comptabilité.
--
--   5. trips / quotes / saved_tours / user_drivers : la lecture directe
--      était déjà masquée (septembre 2026) pour tout le monde sauf
--      Direction ou le propriétaire de la ligne, mais l'ÉCRITURE
--      (UPDATE) ne vérifiait que l'isolation par société — un membre
--      pouvait donc écraser à l'aveugle les champs financiers (coût,
--      marge, bénéfice) d'un trajet/devis d'un collègue qu'il n'a pas le
--      droit de lire. On aligne l'UPDATE sur la même portée que la
--      lecture, en ajoutant Comptabilité (qui doit pouvoir corriger ces
--      données pour toute la société).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rôles : migrer 'membre' -> 'exploitation' (rôle opérationnel le plus
--    proche), puis élargir la contrainte aux 4 rôles métier définitifs.
-- ---------------------------------------------------------------------
UPDATE public.company_users SET role = 'exploitation' WHERE role = 'membre';

ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE public.company_users
ADD CONSTRAINT company_users_role_check
CHECK (role = ANY (ARRAY['direction'::text, 'exploitation'::text, 'comptabilite'::text, 'rh'::text]));

-- ---------------------------------------------------------------------
-- 2. Nouvelles fonctions d'aide RLS (même convention que get_user_license_id
--    / is_company_owner déjà en place).
-- ---------------------------------------------------------------------

-- Direction ou RH : gestion d'équipe (nouveaux accès) et données RH
-- (absences/arrêts des conducteurs). Remplace is_company_admin pour tout
-- ce qui touche à company_users — is_company_admin incluait Exploitation
-- par erreur (voir point 1 ci-dessus). is_company_admin elle-même n'est
-- pas modifiée (ses autres usages, hors company_users, sont hors de la
-- portée de cette migration).
CREATE OR REPLACE FUNCTION public.is_company_rh(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND is_active = true
      AND role IN ('direction', 'rh')
  );
$$;

-- Direction ou Comptabilité : données financières de la société (charges
-- fixes, et correction des champs financiers de trips/quotes/saved_tours
-- pour l'ensemble de la société).
CREATE OR REPLACE FUNCTION public.is_company_financial(p_license_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE license_id = p_license_id
      AND user_id = p_user_id
      AND is_active = true
      AND role IN ('direction', 'comptabilite')
  );
$$;

-- ---------------------------------------------------------------------
-- 3. company_users : la Direction ET la RH peuvent inviter (INSERT) —
--    jamais vers le rôle 'direction' par ce chemin, quel que soit l'auteur.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Direction can invite members" ON public.company_users;
CREATE POLICY "Direction can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND license_id = public.get_user_license_id(auth.uid())
  AND public.is_company_rh(public.get_user_license_id(auth.uid()), auth.uid())
  AND role <> 'direction'
);

-- ---------------------------------------------------------------------
-- 4. Corriger le déclencheur anti-escalade : la Direction doit pouvoir
--    changer le rôle d'un AUTRE membre (jamais le sien, jamais vers
--    'direction') depuis l'application normale, pas seulement via
--    l'outil interne admin_context.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Contexte admin interne (outil vendeur / RPC service_role) : toujours autorisé.
  IF current_setting('app.admin_context', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Rien de sensible ne change : on laisse passer.
  IF OLD IS NOT NULL AND NEW.role = OLD.role AND NEW.license_id = OLD.license_id AND NEW.is_active = OLD.is_active THEN
    RETURN NEW;
  END IF;

  -- Changement de rôle : autorisé uniquement si l'auteur authentifié est
  -- Direction de CETTE société, agit sur la fiche d'un AUTRE membre
  -- (jamais la sienne), et n'attribue jamais 'direction' par ce chemin.
  -- On revérifie le rôle de l'auteur en base (is_company_owner) plutôt
  -- que de faire confiance à la seule policy RLS qui a laissé passer la
  -- requête : le déclencheur reste une seconde ligne de défense indépendante.
  IF OLD IS NOT NULL AND NEW.role <> OLD.role THEN
    IF auth.uid() IS NOT NULL
       AND OLD.user_id IS DISTINCT FROM auth.uid()
       AND OLD.role <> 'direction'
       AND NEW.role <> 'direction'
       AND public.is_company_owner(OLD.license_id, auth.uid())
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Role changes require admin context (privilege escalation blocked)';
  END IF;

  -- Promotion vers 'direction' : jamais par ce chemin (admin_context déjà traité au-dessus).
  IF NEW.role = 'direction' AND (OLD IS NULL OR OLD.role <> 'direction') THEN
    RAISE EXCEPTION 'Privilege escalation blocked: only service_role/admin_context can assign direction role';
  END IF;

  -- Vol de société : inchangé.
  IF OLD IS NOT NULL AND NEW.license_id <> OLD.license_id THEN
    RAISE EXCEPTION 'Cannot change license_id of an existing company_user';
  END IF;

  -- Activation/désactivation hors contexte admin : inchangé.
  IF OLD IS NOT NULL AND NEW.is_active <> OLD.is_active THEN
    RAISE EXCEPTION 'is_active changes require admin context';
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 5. driver_absences : réservé à Direction + RH (lecture et écriture).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "RH scope on driver_absences" ON public.driver_absences;
CREATE POLICY "RH scope on driver_absences"
ON public.driver_absences
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_company_rh(license_id, auth.uid()))
WITH CHECK (public.is_company_rh(license_id, auth.uid()));

-- ---------------------------------------------------------------------
-- 6. user_charges / charge_presets : réservé à Direction + Comptabilité.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Financial scope on user_charges" ON public.user_charges;
CREATE POLICY "Financial scope on user_charges"
ON public.user_charges
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_company_financial(license_id, auth.uid()))
WITH CHECK (public.is_company_financial(license_id, auth.uid()));

DROP POLICY IF EXISTS "Financial scope on charge_presets" ON public.charge_presets;
CREATE POLICY "Financial scope on charge_presets"
ON public.charge_presets
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_company_financial(license_id, auth.uid()))
WITH CHECK (public.is_company_financial(license_id, auth.uid()));

-- ---------------------------------------------------------------------
-- 7. trips / quotes / saved_tours / user_drivers : l'UPDATE ne doit pas
--    permettre d'écrire à l'aveugle sur la fiche financière d'un collègue
--    qu'on n'a pas le droit de lire — même portée que la lecture directe
--    (propriétaire, ou Direction), en ajoutant Comptabilité qui doit
--    pouvoir corriger ces données pour toute la société.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Financial write scope on trips" ON public.trips;
CREATE POLICY "Financial write scope on trips"
ON public.trips
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()));

DROP POLICY IF EXISTS "Financial write scope on quotes" ON public.quotes;
CREATE POLICY "Financial write scope on quotes"
ON public.quotes
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()));

DROP POLICY IF EXISTS "Financial write scope on saved_tours" ON public.saved_tours;
CREATE POLICY "Financial write scope on saved_tours"
ON public.saved_tours
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()));

DROP POLICY IF EXISTS "Financial write scope on user_drivers" ON public.user_drivers;
CREATE POLICY "Financial write scope on user_drivers"
ON public.user_drivers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_company_owner(license_id, auth.uid()) OR public.is_company_financial(license_id, auth.uid()));

-- Note : preserve_driver_salary_on_update() (trigger sur user_drivers,
-- 20260907064609) continue de s'appliquer par-dessus cette policy et
-- reste la protection réelle du salaire — cette policy RESTRICTIVE ajoute
-- seulement la protection équivalente pour trips/quotes/saved_tours, qui
-- n'avaient pas d'équivalent.
