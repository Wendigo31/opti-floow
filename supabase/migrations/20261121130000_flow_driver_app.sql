-- Appli conducteur OptiFlow (nov. 2026) : pointage et heures, journée (repas,
-- découcher), frais / pleins / contrôles / pannes, documents et preuves.
-- Le conducteur n'a pas de compte : il écrit seulement par les fonctions
-- driver_* avec le jeton de son lien personnel (driver_access_links).

CREATE TABLE IF NOT EXISTS public.driver_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  work_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('start', 'break_start', 'break_end', 'end')),
  at timestamptz NOT NULL DEFAULT now(),
  odometer integer,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_time_entries_idx ON public.driver_time_entries (license_id, driver_id, work_date, at);

CREATE TABLE IF NOT EXISTS public.driver_day_reports (
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  work_date date NOT NULL,
  meals integer NOT NULL DEFAULT 0 CHECK (meals BETWEEN 0 AND 3),
  overnight boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (license_id, driver_id, work_date)
);

CREATE TABLE IF NOT EXISTS public.driver_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  work_date date NOT NULL,
  entry_id uuid,
  vehicle_id text,
  kind text NOT NULL CHECK (kind IN ('fuel', 'adblue', 'toll', 'expense', 'checklist', 'breakdown')),
  amount numeric(10,2),
  liters numeric(10,2),
  odometer integer,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  doc_path text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_logs_idx ON public.driver_logs (license_id, work_date DESC);

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  work_date date NOT NULL,
  entry_id uuid,
  kind text NOT NULL CHECK (kind IN ('cmr', 'delivery_note', 'photo', 'reserve', 'weighing', 'site_note', 'signature', 'other')),
  path text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_documents_idx ON public.driver_documents (license_id, work_date DESC);

CREATE TABLE IF NOT EXISTS public.driver_upload_tickets (
  path text PRIMARY KEY,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  used boolean NOT NULL DEFAULT false
);

-- Bureau : lecture et suivi par la société (écriture du conducteur : fonctions ci-dessous).
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['driver_time_entries', 'driver_day_reports', 'driver_logs', 'driver_documents'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_company', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (license_id = public.get_user_license_id(auth.uid())) WITH CHECK (license_id = public.get_user_license_id(auth.uid()))', t || '_company', t);
  END LOOP;
END $$;
ALTER TABLE public.driver_upload_tickets ENABLE ROW LEVEL SECURITY; -- aucune règle : fonctions uniquement

INSERT INTO storage.buckets (id, name, public) VALUES ('driver-docs', 'driver-docs', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
DROP POLICY IF EXISTS driver_docs_upload ON storage.objects;
CREATE POLICY driver_docs_upload ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'driver-docs' AND EXISTS (
    SELECT 1 FROM public.driver_upload_tickets t WHERE t.path = name AND NOT t.used AND t.expires_at > now()));
DROP POLICY IF EXISTS driver_docs_company_read ON storage.objects;
CREATE POLICY driver_docs_company_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = public.get_user_license_id(auth.uid())::text);

-- Jeton → société + conducteur.
CREATE OR REPLACE FUNCTION public._driver_link(p_token text, OUT license_id uuid, OUT driver_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 20 THEN RAISE EXCEPTION 'Lien invalide' USING errcode = '28000'; END IF;
  SELECT l.license_id, l.driver_id INTO license_id, driver_id FROM public.driver_access_links l WHERE l.token = p_token;
  IF license_id IS NULL THEN RAISE EXCEPTION 'Lien invalide ou remplacé : demandez un nouveau lien' USING errcode = '28000'; END IF;
  UPDATE public.driver_access_links SET last_used_at = now() WHERE token = p_token;
END $$;
REVOKE ALL ON FUNCTION public._driver_link(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._paris_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Europe/Paris')::date $$;

-- Journée complète du conducteur : lignes, pointages, journée, frais, documents, véhicule.
CREATE OR REPLACE FUNCTION public.driver_app_day(p_token text, p_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record; v_day date := coalesce(p_date, public._paris_today()); v jsonb; v_vehicle jsonb;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  v := public.driver_day(p_token, v_day);
  SELECT jsonb_build_object('id', uv.local_id, 'name', uv.name, 'plate', uv.license_plate) INTO v_vehicle
    FROM public.planning_entries e JOIN public.user_vehicles uv ON uv.license_id = e.license_id AND uv.local_id = e.vehicle_id::text
   WHERE e.license_id = k.license_id AND e.planning_date = v_day AND e.driver_id = k.driver_id AND e.vehicle_id IS NOT NULL
   ORDER BY e.start_time NULLS LAST LIMIT 1;
  RETURN v || jsonb_build_object(
    'vehicle', v_vehicle,
    'time', coalesce((SELECT jsonb_agg(jsonb_build_object('kind', t.kind, 'at', t.at, 'odometer', t.odometer) ORDER BY t.at)
                        FROM public.driver_time_entries t WHERE t.license_id = k.license_id AND t.driver_id = k.driver_id AND t.work_date = v_day), '[]'::jsonb),
    'report', (SELECT jsonb_build_object('meals', r.meals, 'overnight', r.overnight, 'notes', r.notes)
                 FROM public.driver_day_reports r WHERE r.license_id = k.license_id AND r.driver_id = k.driver_id AND r.work_date = v_day),
    'logs', coalesce((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'kind', g.kind, 'amount', g.amount, 'liters', g.liters, 'odometer', g.odometer, 'data', g.data, 'has_doc', g.doc_path IS NOT NULL, 'at', g.created_at) ORDER BY g.created_at)
                        FROM public.driver_logs g WHERE g.license_id = k.license_id AND g.driver_id = k.driver_id AND g.work_date = v_day), '[]'::jsonb),
    'documents', coalesce((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'entry_id', d.entry_id, 'note', d.note, 'at', d.created_at) ORDER BY d.created_at)
                        FROM public.driver_documents d WHERE d.license_id = k.license_id AND d.driver_id = k.driver_id AND d.work_date = v_day), '[]'::jsonb)
  );
END $$;

-- Semaine : nombre de lignes et horaires par jour.
CREATE OR REPLACE FUNCTION public.driver_app_week(p_token text, p_from date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('date', d::date,
      'tours', (SELECT count(*) FROM public.planning_entries e WHERE e.license_id = k.license_id AND e.planning_date = d::date AND e.status <> 'cancelled' AND (e.driver_id = k.driver_id OR e.relay_driver_id = k.driver_id)),
      'first', (SELECT min(e.start_time) FROM public.planning_entries e WHERE e.license_id = k.license_id AND e.planning_date = d::date AND e.status <> 'cancelled' AND (e.driver_id = k.driver_id OR e.relay_driver_id = k.driver_id)),
      'last', (SELECT max(e.end_time) FROM public.planning_entries e WHERE e.license_id = k.license_id AND e.planning_date = d::date AND e.status <> 'cancelled' AND (e.driver_id = k.driver_id OR e.relay_driver_id = k.driver_id)),
      'absence', (SELECT a.absence_type FROM public.driver_absences a WHERE a.license_id = k.license_id AND a.driver_id::text = k.driver_id AND d::date BETWEEN a.start_date AND a.end_date LIMIT 1))
    ORDER BY d) FROM generate_series(p_from, p_from + 6, interval '1 day') d), '[]'::jsonb);
END $$;

-- Pointage : prise de service, coupure, reprise, fin de service.
CREATE OR REPLACE FUNCTION public.driver_clock(p_token text, p_kind text, p_odometer integer DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record; v_day date := public._paris_today(); v_last text;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  IF p_kind NOT IN ('start', 'break_start', 'break_end', 'end') THEN RAISE EXCEPTION 'Pointage inconnu'; END IF;
  SELECT t.kind INTO v_last FROM public.driver_time_entries t
   WHERE t.license_id = k.license_id AND t.driver_id = k.driver_id AND t.work_date = v_day ORDER BY t.at DESC LIMIT 1;
  IF (p_kind = 'start' AND v_last IS NOT NULL AND v_last <> 'end')
     OR (p_kind = 'break_start' AND coalesce(v_last, '') NOT IN ('start', 'break_end'))
     OR (p_kind = 'break_end' AND coalesce(v_last, '') <> 'break_start')
     OR (p_kind = 'end' AND coalesce(v_last, '') NOT IN ('start', 'break_end', 'break_start')) THEN
    RAISE EXCEPTION 'Ce pointage ne suit pas le précédent' USING errcode = '22023';
  END IF;
  IF p_kind = 'end' AND v_last = 'break_start' THEN
    INSERT INTO public.driver_time_entries (license_id, driver_id, work_date, kind) VALUES (k.license_id, k.driver_id, v_day, 'break_end');
  END IF;
  INSERT INTO public.driver_time_entries (license_id, driver_id, work_date, kind, odometer, lat, lng)
  VALUES (k.license_id, k.driver_id, v_day, p_kind, p_odometer, p_lat, p_lng);
  RETURN public.driver_app_day(p_token, v_day);
END $$;

-- Journée : repas, découcher, remarque.
CREATE OR REPLACE FUNCTION public.driver_save_day(p_token text, p_date date, p_meals integer, p_overnight boolean, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  IF p_date > public._paris_today() OR p_date < public._paris_today() - 7 THEN RAISE EXCEPTION 'Journée trop ancienne ou future'; END IF;
  INSERT INTO public.driver_day_reports (license_id, driver_id, work_date, meals, overnight, notes)
  VALUES (k.license_id, k.driver_id, p_date, greatest(0, least(3, coalesce(p_meals, 0))), coalesce(p_overnight, false), nullif(left(p_notes, 1000), ''))
  ON CONFLICT (license_id, driver_id, work_date) DO UPDATE
    SET meals = excluded.meals, overnight = excluded.overnight, notes = excluded.notes, updated_at = now();
END $$;

-- Ticket d'envoi d'un fichier (photo, document) : chemin réservé 15 minutes.
CREATE OR REPLACE FUNCTION public.driver_upload_ticket(p_token text, p_ext text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record; v_path text; v_ext text := lower(coalesce(p_ext, 'jpg'));
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  IF v_ext NOT IN ('jpg', 'jpeg', 'png', 'pdf', 'webp') THEN RAISE EXCEPTION 'Type de fichier refusé'; END IF;
  IF (SELECT count(*) FROM public.driver_upload_tickets t WHERE t.license_id = k.license_id AND t.driver_id = k.driver_id AND t.expires_at > now() - interval '1 hour') > 60 THEN
    RAISE EXCEPTION 'Trop d''envois, réessayez plus tard';
  END IF;
  v_path := k.license_id::text || '/' || k.driver_id || '/' || to_char(public._paris_today(), 'YYYY-MM-DD') || '/' || gen_random_uuid()::text || '.' || v_ext;
  INSERT INTO public.driver_upload_tickets (path, license_id, driver_id) VALUES (v_path, k.license_id, k.driver_id);
  DELETE FROM public.driver_upload_tickets WHERE expires_at < now() - interval '1 day';
  RETURN v_path;
END $$;

CREATE OR REPLACE FUNCTION public._driver_claim_path(k_license uuid, k_driver text, p_path text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_path IS NULL THEN RETURN NULL; END IF;
  UPDATE public.driver_upload_tickets SET used = true
   WHERE path = p_path AND license_id = k_license AND driver_id = k_driver AND NOT used;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fichier introuvable : renvoyez-le'; END IF;
  RETURN p_path;
END $$;
REVOKE ALL ON FUNCTION public._driver_claim_path(uuid, text, text) FROM public, anon, authenticated;

-- Document ou preuve d'une ligne (CMR signée, bon de livraison, photo, réserve, pesée…).
CREATE OR REPLACE FUNCTION public.driver_add_document(p_token text, p_entry uuid, p_kind text, p_path text, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  IF p_entry IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.planning_entries e WHERE e.id = p_entry AND e.license_id = k.license_id AND (e.driver_id = k.driver_id OR e.relay_driver_id = k.driver_id)) THEN
    RAISE EXCEPTION 'Ligne introuvable';
  END IF;
  IF p_path IS NULL AND coalesce(trim(p_note), '') = '' THEN RAISE EXCEPTION 'Rien à enregistrer'; END IF;
  INSERT INTO public.driver_documents (license_id, driver_id, work_date, entry_id, kind, path, note)
  VALUES (k.license_id, k.driver_id, public._paris_today(), p_entry, p_kind, public._driver_claim_path(k.license_id, k.driver_id, p_path), nullif(left(p_note, 2000), ''));
END $$;

-- Véhicule et frais : plein, AdBlue, péage, frais, check-list de départ, panne.
CREATE OR REPLACE FUNCTION public.driver_add_log(p_token text, p_kind text, p_amount numeric, p_liters numeric, p_odometer integer, p_vehicle_id text, p_entry uuid, p_data jsonb, p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE k record;
BEGIN
  SELECT * INTO k FROM public._driver_link(p_token);
  IF p_amount IS NOT NULL AND (p_amount < 0 OR p_amount > 5000) THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF p_liters IS NOT NULL AND (p_liters < 0 OR p_liters > 2000) THEN RAISE EXCEPTION 'Volume invalide'; END IF;
  INSERT INTO public.driver_logs (license_id, driver_id, work_date, entry_id, vehicle_id, kind, amount, liters, odometer, data, doc_path)
  VALUES (k.license_id, k.driver_id, public._paris_today(), p_entry, p_vehicle_id, p_kind, p_amount, p_liters, p_odometer,
          coalesce(p_data, '{}'::jsonb), public._driver_claim_path(k.license_id, k.driver_id, p_path));
  IF p_odometer IS NOT NULL AND p_vehicle_id IS NOT NULL THEN
    UPDATE public.user_vehicles SET current_km = greatest(coalesce(current_km, 0), p_odometer)
     WHERE license_id = k.license_id AND local_id = p_vehicle_id;
  END IF;
END $$;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['driver_app_day(text, date)', 'driver_app_week(text, date)', 'driver_clock(text, text, integer, double precision, double precision)',
    'driver_save_day(text, date, integer, boolean, text)', 'driver_upload_ticket(text, text)', 'driver_add_document(text, uuid, text, text, text)',
    'driver_add_log(text, text, numeric, numeric, integer, text, uuid, jsonb, text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM public', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO anon, authenticated', f);
  END LOOP;
END $$;
