-- =====================================================================
-- Phase 1 : protection des salaires et des marges (Direction uniquement)
-- Lecture directe verrouillée + chemins de lecture masqués pour les autres
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verrouiller le SELECT direct sur les 4 tables sensibles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS user_drivers_select_own_or_company ON public.user_drivers;
CREATE POLICY user_drivers_select_direction_only
  ON public.user_drivers FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_owner(license_id, auth.uid())
  );

DROP POLICY IF EXISTS trips_select_own_or_company ON public.trips;
CREATE POLICY trips_select_direction_only
  ON public.trips FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_owner(license_id, auth.uid())
  );

DROP POLICY IF EXISTS quotes_select_own_or_company ON public.quotes;
CREATE POLICY quotes_select_direction_only
  ON public.quotes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_owner(license_id, auth.uid())
  );

DROP POLICY IF EXISTS saved_tours_select_own_or_company ON public.saved_tours;
CREATE POLICY saved_tours_select_direction_only
  ON public.saved_tours FOR SELECT TO authenticated
  USING (
    user_id = (auth.uid())::text
    OR public.is_company_owner(license_id, auth.uid())
  );

-- ---------------------------------------------------------------------
-- 2. Helper : retirer les clés de rémunération d'un payload conducteur
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strip_driver_salary_keys(p_data jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_data, '{}'::jsonb)
    - 'baseSalary' - 'hourlyRate' - 'patronalCharges'
    - 'mealAllowance' - 'overnightAllowance'
    - 'sundayBonus' - 'nightBonus' - 'seniorityBonus' - 'unloadingBonus'
    - 'interimHourlyRate' - 'interimCoefficient';
$$;

-- ---------------------------------------------------------------------
-- 3. Conducteurs masqués
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_drivers_masked()
RETURNS TABLE(
  id uuid, user_id uuid, license_id uuid, local_id text, name text,
  driver_type text, base_salary numeric, hourly_rate numeric,
  driver_data jsonb, created_at timestamptz, updated_at timestamptz,
  synced_at timestamptz, can_view_salary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT public.get_user_license_id(auth.uid()) AS lid
  )
  SELECT
    d.id, d.user_id, d.license_id, d.local_id, d.name, d.driver_type,
    CASE WHEN public.is_company_owner(d.license_id, auth.uid()) THEN d.base_salary END,
    CASE WHEN public.is_company_owner(d.license_id, auth.uid()) THEN d.hourly_rate END,
    CASE WHEN public.is_company_owner(d.license_id, auth.uid())
         THEN d.driver_data
         ELSE public.strip_driver_salary_keys(d.driver_data) END,
    d.created_at, d.updated_at, d.synced_at,
    public.is_company_owner(d.license_id, auth.uid())
  FROM public.user_drivers d, ctx
  WHERE d.license_id = ctx.lid OR d.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_drivers_masked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_drivers_masked() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. Trajets masqués
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trips_masked()
RETURNS TABLE(
  id uuid, user_id uuid, license_id uuid, client_id uuid,
  origin_address text, origin_lat double precision, origin_lng double precision,
  destination_address text, destination_lat double precision, destination_lng double precision,
  stops jsonb, distance_km double precision, duration_minutes integer,
  toll_cost double precision, fuel_cost double precision, adblue_cost double precision,
  driver_cost double precision, structure_cost double precision, total_cost double precision,
  revenue double precision, profit double precision, profit_margin double precision,
  driver_ids text[], vehicle_data jsonb, trip_date date, notes text, status text,
  created_at timestamptz, updated_at timestamptz, can_view_financials boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (SELECT public.get_user_license_id(auth.uid()) AS lid)
  SELECT
    t.id, t.user_id, t.license_id, t.client_id,
    t.origin_address, t.origin_lat, t.origin_lng,
    t.destination_address, t.destination_lat, t.destination_lng,
    t.stops, t.distance_km, t.duration_minutes,
    CASE WHEN fin.ok THEN t.toll_cost END,
    CASE WHEN fin.ok THEN t.fuel_cost END,
    CASE WHEN fin.ok THEN t.adblue_cost END,
    CASE WHEN fin.ok THEN t.driver_cost END,
    CASE WHEN fin.ok THEN t.structure_cost END,
    CASE WHEN fin.ok THEN t.total_cost END,
    CASE WHEN fin.ok THEN t.revenue END,
    CASE WHEN fin.ok THEN t.profit END,
    CASE WHEN fin.ok THEN t.profit_margin END,
    t.driver_ids, t.vehicle_data, t.trip_date, t.notes, t.status,
    t.created_at, t.updated_at, fin.ok
  FROM public.trips t
  CROSS JOIN ctx
  CROSS JOIN LATERAL (
    SELECT public.is_company_owner(t.license_id, auth.uid()) AS ok
  ) fin
  WHERE t.license_id = ctx.lid OR t.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_trips_masked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trips_masked() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Devis masqués
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quotes_masked()
RETURNS TABLE(
  id uuid, user_id uuid, license_id uuid, client_id uuid, quote_number text,
  origin_address text, destination_address text, stops jsonb,
  distance_km double precision, total_cost double precision,
  margin_percent double precision, price_ht double precision,
  tva_rate double precision, price_ttc double precision,
  valid_until date, notes text, status text,
  created_at timestamptz, updated_at timestamptz, can_view_financials boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (SELECT public.get_user_license_id(auth.uid()) AS lid)
  SELECT
    q.id, q.user_id, q.license_id, q.client_id, q.quote_number,
    q.origin_address, q.destination_address, q.stops, q.distance_km,
    CASE WHEN fin.ok THEN q.total_cost END,
    CASE WHEN fin.ok THEN q.margin_percent END,
    CASE WHEN fin.ok THEN q.price_ht END,
    q.tva_rate,
    CASE WHEN fin.ok THEN q.price_ttc END,
    q.valid_until, q.notes, q.status,
    q.created_at, q.updated_at, fin.ok
  FROM public.quotes q
  CROSS JOIN ctx
  CROSS JOIN LATERAL (
    SELECT public.is_company_owner(q.license_id, auth.uid()) AS ok
  ) fin
  WHERE q.license_id = ctx.lid OR q.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_quotes_masked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quotes_masked() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. Tournées enregistrées masquées
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_saved_tours_masked()
RETURNS TABLE(
  id uuid, user_id text, license_id uuid, client_id uuid, name text,
  origin_address text, destination_address text, stops jsonb,
  distance_km numeric, duration_minutes numeric,
  toll_cost numeric, fuel_cost numeric, adblue_cost numeric,
  driver_cost numeric, structure_cost numeric, vehicle_cost numeric,
  total_cost numeric, pricing_mode text, price_per_km numeric,
  fixed_price numeric, target_margin numeric, revenue numeric,
  profit numeric, profit_margin numeric,
  vehicle_id text, vehicle_data jsonb, vehicle_ids text[], vehicles_data jsonb,
  trailer_id text, trailer_data jsonb,
  driver_ids text[], drivers_data jsonb,
  notes text, tags text[], is_favorite boolean, category text,
  mission_order text, created_at timestamptz, updated_at timestamptz,
  can_view_financials boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (SELECT public.get_user_license_id(auth.uid()) AS lid)
  SELECT
    s.id, s.user_id, s.license_id, s.client_id, s.name,
    s.origin_address, s.destination_address, s.stops,
    s.distance_km, s.duration_minutes,
    CASE WHEN fin.ok THEN s.toll_cost END,
    CASE WHEN fin.ok THEN s.fuel_cost END,
    CASE WHEN fin.ok THEN s.adblue_cost END,
    CASE WHEN fin.ok THEN s.driver_cost END,
    CASE WHEN fin.ok THEN s.structure_cost END,
    CASE WHEN fin.ok THEN s.vehicle_cost END,
    CASE WHEN fin.ok THEN s.total_cost END,
    s.pricing_mode,
    CASE WHEN fin.ok THEN s.price_per_km END,
    CASE WHEN fin.ok THEN s.fixed_price END,
    CASE WHEN fin.ok THEN s.target_margin END,
    CASE WHEN fin.ok THEN s.revenue END,
    CASE WHEN fin.ok THEN s.profit END,
    CASE WHEN fin.ok THEN s.profit_margin END,
    s.vehicle_id, s.vehicle_data, s.vehicle_ids, s.vehicles_data,
    s.trailer_id, s.trailer_data,
    s.driver_ids,
    CASE WHEN fin.ok THEN s.drivers_data
         ELSE (
           SELECT COALESCE(jsonb_agg(public.strip_driver_salary_keys(elem)), '[]'::jsonb)
           FROM jsonb_array_elements(
             CASE WHEN jsonb_typeof(s.drivers_data) = 'array'
                  THEN s.drivers_data ELSE '[]'::jsonb END
           ) AS elem
         ) END,
    s.notes, s.tags, s.is_favorite, s.category, s.mission_order,
    s.created_at, s.updated_at, fin.ok
  FROM public.saved_tours s
  CROSS JOIN ctx
  CROSS JOIN LATERAL (
    SELECT public.is_company_owner(s.license_id, auth.uid()) AS ok
  ) fin
  WHERE s.license_id = ctx.lid OR s.user_id = (auth.uid())::text;
$$;

REVOKE ALL ON FUNCTION public.get_saved_tours_masked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_saved_tours_masked() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 7. L'ancien RPC conducteurs devient un alias du nouveau (compatibilité)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_drivers_with_salary_check()
RETURNS TABLE(
  id uuid, local_id text, name text, driver_type text,
  hourly_rate numeric, base_salary numeric, driver_data jsonb,
  user_id uuid, license_id uuid, created_at timestamptz,
  updated_at timestamptz, synced_at timestamptz, can_view_salary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.local_id, m.name, m.driver_type,
    m.hourly_rate, m.base_salary, m.driver_data,
    m.user_id, m.license_id, m.created_at,
    m.updated_at, m.synced_at, m.can_view_salary
  FROM public.get_drivers_masked() m;
$$;

REVOKE ALL ON FUNCTION public.get_drivers_with_salary_check() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_drivers_with_salary_check() TO authenticated, service_role;