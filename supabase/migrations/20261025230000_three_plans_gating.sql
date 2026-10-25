-- Trois forfaits (Essentiel / Pro / Entreprise) et blocage des fonctionnalités et onglets selon le forfait. Rejouable sans risque.
alter table public.license_features add column if not exists page_forecast boolean default true;
alter table public.license_features add column if not exists page_ai_analysis boolean default true;
alter table public.license_features add column if not exists page_vehicle_reports boolean default true;
alter table public.license_features add column if not exists page_toxic_clients boolean default true;
alter table public.license_features add column if not exists btn_ai_optimize boolean default true;
update public.central_bridge set config = config || jsonb_build_object('plans', '{"start": {"features": {"basic_calculator": true, "itinerary_planning": true, "dashboard_basic": true, "cost_analysis_basic": true, "auto_pricing_basic": true, "client_analysis_basic": true, "trip_history": true, "multi_drivers": true, "cost_analysis": true, "pdf_export_pro": true, "excel_export": true, "monthly_tracking": true, "auto_pricing": true, "saved_tours": true, "multi_users": true, "unlimited_vehicles": true, "dashboard_analytics": false, "forecast": false, "margin_alerts": false, "dynamic_charts": false, "client_analysis": false, "smart_quotes": false, "ai_optimization": false, "ai_pdf_analysis": false, "multi_agency": false, "tms_erp_integration": false, "page_forecast": false, "page_ai_analysis": false, "page_vehicle_reports": false, "page_toxic_clients": false, "btn_ai_optimize": false, "max_drivers": null, "max_clients": null, "max_vehicles": null, "max_daily_charges": null, "max_monthly_charges": null, "max_yearly_charges": null, "max_saved_tours": null}, "license": {"max_users": 999}}, "pro": {"features": {"basic_calculator": true, "itinerary_planning": true, "dashboard_basic": true, "cost_analysis_basic": true, "auto_pricing_basic": true, "client_analysis_basic": true, "trip_history": true, "multi_drivers": true, "cost_analysis": true, "pdf_export_pro": true, "excel_export": true, "monthly_tracking": true, "auto_pricing": true, "saved_tours": true, "multi_users": true, "unlimited_vehicles": true, "dashboard_analytics": true, "forecast": true, "margin_alerts": true, "dynamic_charts": true, "client_analysis": true, "smart_quotes": true, "ai_optimization": false, "ai_pdf_analysis": false, "multi_agency": false, "tms_erp_integration": false, "page_forecast": true, "page_ai_analysis": false, "page_vehicle_reports": true, "page_toxic_clients": true, "btn_ai_optimize": false, "max_drivers": null, "max_clients": null, "max_vehicles": null, "max_daily_charges": null, "max_monthly_charges": null, "max_yearly_charges": null, "max_saved_tours": null}, "license": {"max_users": 999}}, "enterprise": {"features": {"basic_calculator": true, "itinerary_planning": true, "dashboard_basic": true, "cost_analysis_basic": true, "auto_pricing_basic": true, "client_analysis_basic": true, "trip_history": true, "multi_drivers": true, "cost_analysis": true, "pdf_export_pro": true, "excel_export": true, "monthly_tracking": true, "auto_pricing": true, "saved_tours": true, "multi_users": true, "unlimited_vehicles": true, "dashboard_analytics": true, "forecast": true, "margin_alerts": true, "dynamic_charts": true, "client_analysis": true, "smart_quotes": true, "ai_optimization": true, "ai_pdf_analysis": true, "multi_agency": true, "tms_erp_integration": true, "page_forecast": true, "page_ai_analysis": true, "page_vehicle_reports": true, "page_toxic_clients": true, "btn_ai_optimize": true, "max_drivers": null, "max_clients": null, "max_vehicles": null, "max_daily_charges": null, "max_monthly_charges": null, "max_yearly_charges": null, "max_saved_tours": null}, "license": {"max_users": 999}}}'::jsonb, 'default_plan', 'start') where id = 1;
-- Forfaits Essentiel / Pro / Entreprise : les fonctionnalités et onglets de chaque licence
-- suivent son forfait. Identique dans OptiFlow, OptiFret et OptiXpress (le contenu de chaque
-- forfait est dans central_bridge.config->'plans'). Rejouable sans risque.
--
--  * changement de forfait (ou nouvelle licence) → fonctionnalités remises à celles du forfait ;
--  * une fonctionnalité absente du forfait ne peut pas être activée (même par un administrateur) ;
--  * une valeur de forfait inconnue (ancien « optiflow » / « standard ») → forfait par défaut
--    à la création, forfait inchangé lors d'une modification.

create or replace function public._plan_cfg()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select config from public.central_bridge where id = 1), '{}'::jsonb)
$$;
revoke all on function public._plan_cfg() from public, anon, authenticated;

-- Contenu du forfait d'une licence.
create or replace function public.plan_features_of(p_license_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  v_plan text;
begin
  execute format('select to_jsonb(l)->>%L from public.licenses l where id = $1', coalesce(cfg->>'plan_col', 'plan'))
    into v_plan using p_license_id;
  return cfg->'plans'->v_plan->'features';
end $$;
revoke all on function public.plan_features_of(uuid) from public, anon, authenticated;

-- Remet les fonctionnalités de la licence à celles de son forfait.
create or replace function public.apply_plan_features(p_license_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  f jsonb := public.plan_features_of(p_license_id);
  cols text[];
  k text;
  v jsonb;
begin
  if f is null then return; end if;
  perform set_config('app.admin_context', 'true', true);
  if cfg->>'features_mode' = 'rows' then
    for k, v in select key, value from jsonb_each(f) where jsonb_typeof(value) = 'boolean' loop
      if not exists (select 1 from public.features where code = k) then continue; end if;
      insert into public.license_features (license_id, feature_code, is_enabled, enabled_at, disabled_at)
      values (p_license_id, k, (v #>> '{}')::boolean, now(), case when (v #>> '{}')::boolean then null else now() end)
      on conflict (license_id, feature_code) do update set
        is_enabled = excluded.is_enabled,
        enabled_at = case when excluded.is_enabled and not license_features.is_enabled then now() else license_features.enabled_at end,
        disabled_at = case when not excluded.is_enabled and license_features.is_enabled then now() else license_features.disabled_at end,
        updated_at = now();
    end loop;
  else
    insert into public.license_features (license_id) select p_license_id
     where not exists (select 1 from public.license_features where license_id = p_license_id);
    select array_agg(column_name::text) into cols from information_schema.columns
     where table_schema = 'public' and table_name = 'license_features';
    for k in select key from jsonb_each(f) loop
      if not (k = any(cols)) or k in ('id', 'license_id', 'created_at', 'updated_at') then continue; end if;
      execute format('update public.license_features t set %I = (jsonb_populate_record(null::public.license_features, $1)).%I where t.license_id = $2', k, k)
        using f, p_license_id;
    end loop;
  end if;
end $$;
revoke all on function public.apply_plan_features(uuid) from public, anon, authenticated;

-- Plafond : rien au-delà du forfait.
create or replace function public.license_features_plan_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  f jsonb := public.plan_features_of(new.license_id);
  offs jsonb;
  pv jsonb;
begin
  if f is null then return new; end if;
  if cfg->>'features_mode' = 'rows' then
    if f->>new.feature_code = 'false' and new.is_enabled then
      new.is_enabled := false;
      new.disabled_at := coalesce(new.disabled_at, now());
    end if;
    return new;
  end if;
  select coalesce(jsonb_object_agg(key, false), '{}'::jsonb) into offs
    from jsonb_each(f) where jsonb_typeof(value) = 'boolean' and value = 'false'::jsonb;
  new := jsonb_populate_record(new, offs);
  -- Onglets fermés par le forfait (OptiFret : page_visibility).
  if jsonb_typeof(f->'page_visibility') = 'object' and to_jsonb(new) ? 'page_visibility' then
    select coalesce(jsonb_object_agg(key, false), '{}'::jsonb) into pv
      from jsonb_each(f->'page_visibility') where value = 'false'::jsonb;
    new := jsonb_populate_record(new, jsonb_build_object('page_visibility',
      coalesce(to_jsonb(new)->'page_visibility', '{}'::jsonb) || pv));
  end if;
  return new;
end $$;
drop trigger if exists license_features_plan_cap on public.license_features;
create trigger license_features_plan_cap before insert or update on public.license_features
  for each row execute function public.license_features_plan_cap();

-- Forfait connu obligatoire.
create or replace function public.licenses_plan_normalize()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  col text := coalesce(cfg->>'plan_col', 'plan');
  v text := to_jsonb(new)->>col;
begin
  if cfg->'plans' is null or (v is not null and cfg->'plans' ? v) then return new; end if;
  if tg_op = 'UPDATE' and cfg->'plans' ? (to_jsonb(old)->>col) then
    v := to_jsonb(old)->>col;
  else
    v := coalesce(cfg->>'default_plan', 'start');
  end if;
  new := jsonb_populate_record(new, jsonb_build_object(col, v));
  return new;
end $$;
drop trigger if exists licenses_plan_normalize on public.licenses;
create trigger licenses_plan_normalize before insert or update on public.licenses
  for each row execute function public.licenses_plan_normalize();

-- Nouveau forfait → fonctionnalités du forfait.
create or replace function public.licenses_plan_apply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col text := coalesce(public._plan_cfg()->>'plan_col', 'plan');
begin
  if tg_op = 'INSERT' or (to_jsonb(new)->>col) is distinct from (to_jsonb(old)->>col) then
    perform public.apply_plan_features(new.id);
  end if;
  return null;
end $$;
drop trigger if exists licenses_plan_apply on public.licenses;
create trigger licenses_plan_apply after update on public.licenses
  for each row execute function public.licenses_plan_apply();
-- Nouvelle licence : appliqué à la fin de la transaction, après la création de ses
-- fonctionnalités par le logiciel ou par OptiCentral.
drop trigger if exists licenses_plan_apply_new on public.licenses;
create constraint trigger licenses_plan_apply_new after insert on public.licenses
  deferrable initially deferred
  for each row execute function public.licenses_plan_apply();

alter table public.licenses drop constraint if exists licenses_plan_type_check;
update public.licenses set plan_type = 'enterprise' where plan_type is null or plan_type not in ('start', 'pro', 'enterprise');
alter table public.licenses add constraint licenses_plan_type_check check (plan_type in ('start', 'pro', 'enterprise'));
select public.apply_plan_features(id) from public.licenses;
