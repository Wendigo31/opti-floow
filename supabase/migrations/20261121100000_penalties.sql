-- Pénalités (Comptabilité, nov. 2026) : retenues des clients, pénalités de
-- retard de paiement réclamées, amendes et PV. Même modèle dans les 3 logiciels.
CREATE TABLE IF NOT EXISTS public.penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('client_withholding', 'late_payment', 'fine')),
  occurred_on date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'open',
  reason text,
  reference text,
  client_id text,
  route_id text,
  driver_id text,
  vehicle_id text,
  due_on date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS penalties_license_idx ON public.penalties (license_id, occurred_on DESC);
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS penalties_own_license ON public.penalties;
CREATE POLICY penalties_own_license ON public.penalties FOR ALL
  USING (license_id = public.get_user_license_id(auth.uid())) WITH CHECK (license_id = public.get_user_license_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.penalty_settings (
  license_id uuid PRIMARY KEY REFERENCES public.licenses(id) ON DELETE CASCADE,
  late_rate numeric(6,3) NOT NULL DEFAULT 8.25 CHECK (late_rate > 0 AND late_rate < 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.penalty_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS penalty_settings_own_license ON public.penalty_settings;
CREATE POLICY penalty_settings_own_license ON public.penalty_settings FOR ALL
  USING (license_id = public.get_user_license_id(auth.uid())) WITH CHECK (license_id = public.get_user_license_id(auth.uid()));
