-- =====================================================================
-- Complément à 20261010150000 : company_config n'est plus réservée à
-- Direction/Exploitation en écriture
-- =====================================================================
-- Trouvé en poursuivant l'audit du modèle de rôles : is_company_admin()
-- (role IN ('direction','exploitation')) gardait encore 3 policies sur
-- public.company_config (INSERT/UPDATE/DELETE), seule table oubliée lors
-- de la migration précédente.
--
-- company_config ne contient que du cache/état de synchronisation
-- partagé entre les onglets d'un même utilisateur (config_type:
-- 'license_cache' / 'sync_state' / 'user_preferences', voir
-- useLicense.ts — "Cross-tab sync is now handled via Supabase Realtime
-- on company_config table") : aucune donnée métier sensible. Sa propre
-- policy SELECT ("Company members can view config") n'a d'ailleurs
-- jamais eu de condition de rôle, seulement l'isolation par société.
--
-- Avec is_company_admin() qui ne reconnaît que Direction/Exploitation,
-- un compte Comptabilité ou RH ne pouvait pas écrire son propre état de
-- synchronisation — un vrai bug fonctionnel (silencieux : la synchro
-- entre onglets échoue simplement, le reste de l'app n'en dépend pas),
-- qui existait déjà identiquement pour l'ancien rôle générique 'membre'
-- avant cette session, et qui aurait sinon persisté pour Comptabilité/RH.
--
-- Correctif : on aligne l'écriture sur la même isolation que la lecture
-- (toute la société, sans condition de rôle — cohérent avec le contenu
-- non sensible de cette table), au lieu d'ajouter encore une variante de
-- condition de rôle sur une table qui n'en a jamais eu besoin.

DROP POLICY IF EXISTS "Company admins can create config" ON public.company_config;
CREATE POLICY "Company members can create config"
ON public.company_config
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND updated_by = auth.uid()
  AND license_id = public.get_user_license_id(auth.uid())
);

DROP POLICY IF EXISTS "Company admins can update config" ON public.company_config;
CREATE POLICY "Company members can update config"
ON public.company_config
FOR UPDATE
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
)
WITH CHECK (
  license_id = public.get_user_license_id(auth.uid())
);

DROP POLICY IF EXISTS "Company admins can delete config" ON public.company_config;
CREATE POLICY "Company members can delete config"
ON public.company_config
FOR DELETE
TO authenticated
USING (
  license_id = public.get_user_license_id(auth.uid())
);

-- is_company_admin() elle-même n'est pas touchée : elle n'a plus aucune
-- policy active qui en dépend après ce correctif (confirmé par relecture
-- complète des ~115 migrations), mais la conserver ne coûte rien et évite
-- de casser un appel oublié ailleurs.

-- =====================================================================
-- Nettoyage annexe : policy morte sur access_requests ('responsable')
-- =====================================================================
-- "Direction and responsable can view all requests" (SELECT) teste
-- role = ANY(['direction','responsable']) — 'responsable' n'est plus une
-- valeur de rôle valide depuis la contrainte resserrée du 25/01, cette
-- policy ne matche donc plus JAMAIS pour 'responsable' depuis cette date
-- (elle fonctionne encore pour 'direction'). Pas une régression de cette
-- session : déjà inerte avant. Remplacée pour refléter le vrai rôle
-- équivalent aujourd'hui (RH, qui gère aussi les accès).
--
-- Note trouvée en vérifiant l'usage réel : le seul endroit qui lit cette
-- table (AccessRequestsManager.tsx, panneau admin vendeur) interroge
-- public.access_requests directement avec le client Supabase standard,
-- MAIS la connexion admin (code secret vendeur) n'ouvre aucune vraie
-- session Supabase Auth — seul un jeton interne en sessionStorage. Sans
-- "Se connecter en tant que" (impersonation d'un client précis), auth.uid()
-- est donc NULL et cette policy ne renvoyait jamais aucune ligne au panneau
-- admin, quel que soit son contenu. CÔTÉ FRONT : AccessRequestsManager.tsx
-- passe maintenant par deux nouvelles actions service-role de l'edge
-- function validate-license (list-access-requests / process-access-request,
-- supabase/functions/validate-license/admin.ts), sur le même principe que
-- list-all pour les licences — le panneau admin voit maintenant vraiment
-- toutes les demandes. Cette policy RLS reste nécessaire pour un éventuel
-- accès direct par un compte Direction/RH authentifié normalement dans
-- l'app (hors panneau admin), d'où sa correction ici malgré tout.

DROP POLICY IF EXISTS "Direction and responsable can view all requests" ON public.access_requests;
CREATE POLICY "Direction and RH can view all requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  license_id IN (
    SELECT company_users.license_id FROM company_users
    WHERE company_users.user_id = auth.uid()
      AND company_users.role = ANY (ARRAY['direction'::text, 'rh'::text])
  )
);

-- =====================================================================
-- process_access_request() : même rôle mort ('responsable'), corrigé
-- =====================================================================
-- La fonction elle-même n'est plus appelée par le panneau admin (qui passe
-- maintenant par process-access-request, service-role, voir ci-dessus),
-- mais elle reste appelable par un compte Direction authentifié normalement
-- dans l'app. Même correction que la policy : 'responsable' → 'rh'.
CREATE OR REPLACE FUNCTION public.process_access_request(
  p_request_id uuid,
  p_status text,
  p_comment text DEFAULT NULL,
  p_processed_by text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT license_id INTO v_license_id
  FROM public.access_requests
  WHERE id = p_request_id;

  IF v_license_id IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;

  -- Verify caller is direction or rh (anciennement 'responsable', rôle mort)
  SELECT role INTO v_caller_role
  FROM public.company_users
  WHERE user_id = auth.uid()
    AND license_id = v_license_id
    AND is_active = true
    AND role IN ('direction', 'rh');

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only direction or rh can process access requests';
  END IF;

  UPDATE public.access_requests
  SET
    status = p_status,
    admin_comment = p_comment,
    processed_by = COALESCE(p_processed_by, (SELECT email FROM auth.users WHERE id = auth.uid())),
    processed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN FOUND;
END;
$$;
