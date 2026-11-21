-- Espace expert-comptable sans Edge Function (21/11/2026) : la société crée, au
-- dépôt du dossier, un lien de téléchargement signé (≈ 13 mois) ; le cabinet,
-- non connecté, ne lit la liste qu'avec un jeton valide (empreinte SHA-256).
ALTER TABLE public.accounting_exports ADD COLUMN IF NOT EXISTS share_url text;

CREATE OR REPLACE FUNCTION public.accountant_portal(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.accountant_links%ROWTYPE;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{40,64}$' THEN
    RETURN jsonb_build_object('error', 'Lien invalide.');
  END IF;
  SELECT * INTO v_link FROM public.accountant_links
  WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < now()) THEN
    RETURN jsonb_build_object('error', 'Lien invalide, expiré ou révoqué. Demandez un nouveau lien à votre client.');
  END IF;
  UPDATE public.accountant_links SET last_access_at = now() WHERE id = v_link.id;
  RETURN jsonb_build_object(
    'company', coalesce(v_link.company, 'Votre client'),
    'label', v_link.label,
    'expires_at', v_link.expires_at,
    'exports', coalesce((
      SELECT jsonb_agg(jsonb_build_object('period', e.period, 'created_at', e.created_at, 'size', e.size, 'contents', e.contents, 'url', e.share_url) ORDER BY e.period DESC)
      FROM (SELECT * FROM public.accounting_exports WHERE license_id = v_link.license_id AND share_url IS NOT NULL ORDER BY period DESC LIMIT 36) e
    ), '[]'::jsonb)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.accountant_portal(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accountant_portal(text) TO anon, authenticated;
