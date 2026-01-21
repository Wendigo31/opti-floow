-- 1) Saved tours: add category field for organisation
ALTER TABLE public.saved_tours
ADD COLUMN IF NOT EXISTS category text;

-- 2) Charge presets (snapshots) for company-wide reuse
CREATE TABLE IF NOT EXISTS public.charge_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  charges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charge_presets ENABLE ROW LEVEL SECURITY;

-- Policies: company members can CRUD presets for their company; otherwise personal presets only
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='charge_presets' AND policyname='Company members can view charge presets'
  ) THEN
    CREATE POLICY "Company members can view charge presets"
    ON public.charge_presets
    FOR SELECT
    USING (
      (license_id IS NOT NULL AND license_id = public.get_user_license_id(auth.uid()))
      OR (license_id IS NULL AND created_by = auth.uid())
    );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='charge_presets' AND policyname='Company members can create charge presets'
  ) THEN
    CREATE POLICY "Company members can create charge presets"
    ON public.charge_presets
    FOR INSERT
    WITH CHECK (
      created_by = auth.uid()
      AND (
        license_id IS NULL
        OR license_id = public.get_user_license_id(auth.uid())
      )
    );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='charge_presets' AND policyname='Company members can update charge presets'
  ) THEN
    CREATE POLICY "Company members can update charge presets"
    ON public.charge_presets
    FOR UPDATE
    USING (
      (license_id IS NOT NULL AND license_id = public.get_user_license_id(auth.uid()))
      OR (license_id IS NULL AND created_by = auth.uid())
    );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='charge_presets' AND policyname='Company members can delete charge presets'
  ) THEN
    CREATE POLICY "Company members can delete charge presets"
    ON public.charge_presets
    FOR DELETE
    USING (
      (license_id IS NOT NULL AND license_id = public.get_user_license_id(auth.uid()))
      OR (license_id IS NULL AND created_by = auth.uid())
    );
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_charge_presets_updated_at'
  ) THEN
    CREATE TRIGGER update_charge_presets_updated_at
    BEFORE UPDATE ON public.charge_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Fix company-wide sync duplication issues by enforcing 1 row per (license_id, local_id)
--    and cleaning existing duplicates (keep most recent by synced_at/updated_at/created_at)

-- user_charges
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY license_id, local_id
           ORDER BY synced_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.user_charges
  WHERE license_id IS NOT NULL
)
DELETE FROM public.user_charges u
USING ranked r
WHERE u.ctid = r.ctid AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_charges_license_local_uniq
ON public.user_charges (license_id, local_id)
WHERE license_id IS NOT NULL;

-- user_vehicles
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY license_id, local_id
           ORDER BY synced_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.user_vehicles
  WHERE license_id IS NOT NULL
)
DELETE FROM public.user_vehicles u
USING ranked r
WHERE u.ctid = r.ctid AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_vehicles_license_local_uniq
ON public.user_vehicles (license_id, local_id)
WHERE license_id IS NOT NULL;

-- user_trailers
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY license_id, local_id
           ORDER BY synced_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.user_trailers
  WHERE license_id IS NOT NULL
)
DELETE FROM public.user_trailers u
USING ranked r
WHERE u.ctid = r.ctid AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_trailers_license_local_uniq
ON public.user_trailers (license_id, local_id)
WHERE license_id IS NOT NULL;

-- user_drivers
WITH ranked AS (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY license_id, local_id
           ORDER BY synced_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.user_drivers
  WHERE license_id IS NOT NULL
)
DELETE FROM public.user_drivers u
USING ranked r
WHERE u.ctid = r.ctid AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_drivers_license_local_uniq
ON public.user_drivers (license_id, local_id)
WHERE license_id IS NOT NULL;

-- 4) Realtime: ensure charge_presets emits realtime events
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.charge_presets;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;