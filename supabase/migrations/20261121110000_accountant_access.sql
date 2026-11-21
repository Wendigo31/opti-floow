-- Accès expert-comptable (nov. 2026) : liens personnels en lecture seule et
-- dossiers comptables mensuels (ZIP dans le stockage privé « accounting »).
CREATE TABLE IF NOT EXISTS public.accountant_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  label text NOT NULL,
  email text,
  company text,
  token_hash text NOT NULL UNIQUE,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_access_at timestamptz
);
ALTER TABLE public.accountant_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accountant_links_company ON public.accountant_links;
CREATE POLICY accountant_links_company ON public.accountant_links FOR ALL
  USING (license_id = public.get_user_license_id(auth.uid())) WITH CHECK (license_id = public.get_user_license_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.accounting_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  path text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  contents jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounting_exports_license_idx ON public.accounting_exports (license_id, period DESC);
ALTER TABLE public.accounting_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accounting_exports_company ON public.accounting_exports;
CREATE POLICY accounting_exports_company ON public.accounting_exports FOR ALL
  USING (license_id = public.get_user_license_id(auth.uid())) WITH CHECK (license_id = public.get_user_license_id(auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('accounting', 'accounting', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
DROP POLICY IF EXISTS accounting_objects_company ON storage.objects;
CREATE POLICY accounting_objects_company ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'accounting' AND (storage.foldername(name))[1] = (public.get_user_license_id(auth.uid())::text))
  WITH CHECK (bucket_id = 'accounting' AND (storage.foldername(name))[1] = (public.get_user_license_id(auth.uid())::text));
