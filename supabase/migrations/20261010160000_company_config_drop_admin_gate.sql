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
-- est donc NULL et cette policy ne renvoie jamais aucune ligne au
-- panneau admin, quel que soit son contenu. Ce correctif rend la policy
-- cohérente sur le papier, mais NE RÉSOUT PAS ce problème plus profond —
-- il faudrait un accès service_role (edge function dédiée, comme
-- validate-license le fait déjà pour lister les licences) pour que le
-- panneau admin voie vraiment toutes les demandes. Signalé à l'utilisateur,
-- pas corrigé ici (changement d'architecture, pas un correctif de policy).

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
