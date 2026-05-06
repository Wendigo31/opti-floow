
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a direction-role member of any company?
CREATE OR REPLACE FUNCTION public.is_any_direction(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = p_user_id
      AND is_active = true
      AND role = 'direction'
  );
$$;

CREATE POLICY "pricing_config_select_direction"
ON public.pricing_config FOR SELECT
TO authenticated
USING (public.is_any_direction(auth.uid()));

CREATE POLICY "pricing_config_insert_direction"
ON public.pricing_config FOR INSERT
TO authenticated
WITH CHECK (public.is_any_direction(auth.uid()) AND updated_by = auth.uid());

CREATE POLICY "pricing_config_update_direction"
ON public.pricing_config FOR UPDATE
TO authenticated
USING (public.is_any_direction(auth.uid()))
WITH CHECK (public.is_any_direction(auth.uid()));

CREATE POLICY "pricing_config_delete_direction"
ON public.pricing_config FOR DELETE
TO authenticated
USING (public.is_any_direction(auth.uid()));

CREATE POLICY "pricing_config_service_role"
ON public.pricing_config FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_pricing_config_updated_at
BEFORE UPDATE ON public.pricing_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default configuration
INSERT INTO public.pricing_config (config_key, config_data, description) VALUES
('plans', '{
  "start": {"name": "Start", "monthly": 79, "yearly": 711, "floor": 49, "annualDiscountPct": 25},
  "pro": {"name": "Pro", "monthly": 199, "yearly": 1791, "floor": 129, "annualDiscountPct": 25},
  "enterprise": {"name": "Enterprise", "monthly": 499, "yearly": 4491, "floor": 299, "annualDiscountPct": 25}
}'::jsonb, 'Forfaits publics: prix mensuels, annuels (-25%), planchers négociables'),
('discounts', '{
  "junior": {"label": "Commercial Junior", "maxPct": 10},
  "senior": {"label": "Commercial Senior", "maxPct": 20},
  "direction": {"label": "Direction", "maxPct": 40},
  "retention": {"label": "Rétention churn", "maxPct": 30}
}'::jsonb, 'Seuils maximaux de remise par profil commercial'),
('addons', '[
  {"id": "extra_resources_10", "name": "+10 ressources (véhicules/conducteurs/clients/tournées)", "monthly": 19, "yearly": 171},
  {"id": "ai_extended", "name": "Analyses IA étendues", "monthly": 39, "yearly": 351},
  {"id": "multi_agency", "name": "Multi-agences", "monthly": 49, "yearly": 441},
  {"id": "priority_support", "name": "Support prioritaire 24/7", "monthly": 29, "yearly": 261}
]'::jsonb, 'Catalogue add-ons activables'),
('upsell_triggers', '{
  "to_pro": {"vehiclesGt": 5, "needsPlanning": true, "needsAi": true},
  "to_enterprise": {"vehiclesGt": 20, "needsTeam": true, "needsMultiAgency": true}
}'::jsonb, 'Règles automatiques de transition de forfait')
ON CONFLICT (config_key) DO NOTHING;
