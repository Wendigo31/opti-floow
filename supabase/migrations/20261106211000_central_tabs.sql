-- Onglets du forfait et réouverture depuis OptiCentral (nov. 2026).
-- Avant : les onglets bloqués par le forfait étaient ajoutés à chaque lecture
-- (company_access), si bien qu'OptiCentral ne pouvait jamais les rouvrir : activer l'option ou
-- décocher l'onglet ne changeait rien dans le logiciel.
-- Maintenant :
--  * les onglets du forfait sont écrits dans licenses.hidden_pages au changement de forfait
--    (et à la création d'une licence) ; company_access ne lit plus que cette colonne ;
--  * décocher un onglet dans OptiCentral le rouvre ;
--  * activer une option depuis OptiCentral rouvre aussi les onglets qui en dépendent
--    (correspondance option → onglets dans central_bridge.config->'feature_pages').

-- 1. Les licences existantes gardent exactement ce qu'elles voient aujourd'hui.
update public.licenses l
   set hidden_pages = (
     select coalesce(array_agg(distinct x), '{}'::text[]) from (
       select unnest(coalesce(l.hidden_pages, '{}'::text[])) x
       union
       select jsonb_array_elements_text(coalesce(
         public._plan_cfg()->'plans'->(to_jsonb(l) ->> coalesce(public._plan_cfg()->>'plan_col', 'plan'))->'license'->'hidden_pages',
         '[]'::jsonb))
     ) h);

-- 2. Lecture : la colonne seule.
create or replace function public.company_access(p_license_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with cfg as (select public._plan_cfg() c),
  lic as (
    select l.*, to_jsonb(l) ->> coalesce((select c->>'plan_col' from cfg), 'plan') as plan_key
    from public.licenses l where l.id = p_license_id)
  select coalesce((
    select jsonb_build_object(
      'hidden_pages', to_jsonb(coalesce(lic.hidden_pages, '{}'::text[])),
      'plan', lic.plan_key,
      'contact_complete', coalesce(nullif(trim(lic.company_phone), ''), '') <> '' and coalesce(nullif(trim(lic.company_email), ''), '') <> '',
      'company_name', lic.company_name)
    from lic),
    jsonb_build_object('hidden_pages', '[]'::jsonb, 'contact_complete', true));
$$;
revoke all on function public.company_access(uuid) from public;
grant execute on function public.company_access(uuid) to anon, authenticated;

-- 3. Nouveau forfait (ou nouvelle licence) : fonctionnalités ET onglets du forfait.
create or replace function public.licenses_plan_apply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  col text := coalesce(cfg->>'plan_col', 'plan');
  hp jsonb;
begin
  if tg_op = 'INSERT' or (to_jsonb(new)->>col) is distinct from (to_jsonb(old)->>col) then
    perform public.apply_plan_features(new.id);
    hp := cfg->'plans'->(to_jsonb(new)->>col)->'license'->'hidden_pages';
    if jsonb_typeof(hp) = 'array' then
      update public.licenses set hidden_pages = array(select jsonb_array_elements_text(hp)) where id = new.id;
    end if;
  end if;
  return null;
end $$;

-- 4. Option activée depuis OptiCentral → ses onglets sont rouverts.
update public.central_bridge set config = config || jsonb_build_object('feature_pages', '{"page_ai_analysis": ["/ai-analysis"], "ai_pdf_analysis": ["/ai-analysis"], "ai_optimization": ["/line-montage"], "forecast": ["/forecast"], "page_forecast": ["/forecast"], "page_vehicle_reports": ["/vehicle-reports"], "smart_quotes": ["/tenders"]}'::jsonb) where id = 1;

create or replace function public.license_features_open_pages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  map jsonb := public._plan_cfg()->'feature_pages';
  opened text[] := '{}';
  k text;
begin
  if coalesce(current_setting('app.admin_context', true), '') <> 'true' or map is null then return null; end if;
  if to_jsonb(new) ? 'feature_code' then
    if (to_jsonb(new)->>'is_enabled')::boolean and (tg_op = 'INSERT' or not coalesce((to_jsonb(old)->>'is_enabled')::boolean, false)) then
      opened := array(select jsonb_array_elements_text(coalesce(map->(to_jsonb(new)->>'feature_code'), '[]'::jsonb)));
    end if;
  else
    for k in select key from jsonb_each(map) loop
      if (to_jsonb(new)->>k) = 'true' and (tg_op = 'INSERT' or coalesce(to_jsonb(old)->>k, 'false') <> 'true') then
        opened := opened || array(select jsonb_array_elements_text(map->k));
      end if;
    end loop;
  end if;
  if cardinality(opened) > 0 then
    update public.licenses
       set hidden_pages = array(select x from unnest(coalesce(hidden_pages, '{}'::text[])) x where not (x = any(opened)))
     where id = new.license_id;
  end if;
  return null;
end $$;
revoke all on function public.license_features_open_pages() from public, anon, authenticated;
drop trigger if exists license_features_open_pages on public.license_features;
create trigger license_features_open_pages after insert or update on public.license_features
  for each row execute function public.license_features_open_pages();
