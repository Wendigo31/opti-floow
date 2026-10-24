-- =====================================================
-- Lien public d'acceptation de devis : le client reçoit un email avec un
-- lien non authentifié, et peut cliquer Accepter ou Refuser, en signant
-- d'un nom tapé (pas de signature électronique certifiée par un tiers —
-- scope validé explicitement par l'utilisateur le 24/10 : clic + nom tapé,
-- email automatique via Resend, Accepter ET Refuser). Vient en complément
-- du changement de statut manuel actuel (src/pages/Tenders.tsx), qui reste
-- disponible — ce lien devient simplement le chemin principal.
-- =====================================================

CREATE TABLE public.quote_acceptance_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  license_id uuid REFERENCES public.licenses(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  sent_to_email text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  response text CHECK (response IN ('accepted', 'refused')),
  signed_name text,
  refusal_comment text,
  response_ip text,
  response_user_agent text
);

CREATE UNIQUE INDEX quote_acceptance_links_token_idx ON public.quote_acceptance_links (token);
CREATE INDEX quote_acceptance_links_quote_id_idx ON public.quote_acceptance_links (quote_id);

-- RLS activée sans aucune policy : ni anon ni authenticated n'a de droit
-- direct sur cette table (deny-all par défaut tant qu'aucune policy ne
-- l'autorise explicitement — même principe que access_requests via le
-- panneau admin, session du 10/10). Tout accès passe par l'edge function
-- quote-public-link, en client service-role, qui applique elle-même ses
-- propres vérifications : jeton valide/non expiré pour le client public
-- (génération et réponse), appartenance à la société du devis pour la
-- génération du lien côté utilisateur connecté.
ALTER TABLE public.quote_acceptance_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quote_acceptance_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.quote_acceptance_links TO service_role;
