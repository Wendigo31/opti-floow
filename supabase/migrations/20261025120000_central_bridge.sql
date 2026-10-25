-- Pont d'administration OptiCentral (console centrale OptiGroup)
--
-- OptiCentral pilote ce logiciel à distance : licences, fonctionnalités,
-- utilisateurs, historique de connexions, demandes et journal d'administration.
-- Tout passe par une seule fonction, public.central_admin(secret, action, données),
-- protégée par une clé secrète dont seule l'empreinte (SHA-256) est stockée ici
-- (table central_bridge, invisible depuis l'application). Sans la bonne clé,
-- la fonction refuse tout.
--
-- Rejouable sans risque. La clé elle-même n'est jamais dans ce fichier :
-- elle est installée à part par OptiCentral.

create table if not exists public.central_bridge (
  id int primary key default 1 check (id = 1),
  secret_hash text,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.central_bridge add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.central_bridge alter column secret_hash drop not null;
alter table public.central_bridge enable row level security;
revoke all on public.central_bridge from public, anon, authenticated;

-- Modifie les champs autorisés d'une ligne, chaque valeur étant convertie
-- dans le bon type de la colonne.
create or replace function public._central_patch(p_table text, p_where_col text, p_id uuid, p_patch jsonb, p_deny text[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  n int := 0;
  cols text[];
begin
  select array_agg(column_name::text) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = p_table;
  if cols is null then raise exception 'Table inconnue : %', p_table; end if;
  for k in select jsonb_object_keys(coalesce(p_patch, '{}'::jsonb)) loop
    if not (k = any(cols)) or k = any(p_deny) then
      raise exception 'Champ non modifiable : %', k using errcode = '22023';
    end if;
    execute format('update public.%I t set %I = (jsonb_populate_record(null::public.%I, $1)).%I where t.%I = $2',
      p_table, k, p_table, k, p_where_col) using p_patch, p_id;
    get diagnostics n = row_count;
  end loop;
  if 'updated_at' = any(cols) then
    execute format('update public.%I set updated_at = now() where %I = $1', p_table, p_where_col) using p_id;
  end if;
  return n;
end;
$$;
revoke all on function public._central_patch(text, text, uuid, jsonb, text[]) from public, anon, authenticated;

-- Description des champs d'une table (nom + type) pour l'écran d'OptiCentral.
create or replace function public._central_fields(p_table text, p_deny text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', column_name, 'type',
           case when data_type = 'USER-DEFINED' then 'enum:' || (
             select string_agg(e.enumlabel, ',' order by e.enumsortorder)
             from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = c.udt_name)
           else data_type end) order by ordinal_position), '[]'::jsonb)
  from information_schema.columns c
  where table_schema = 'public' and table_name = p_table and not (column_name = any(p_deny));
$$;
revoke all on function public._central_fields(text, text[]) from public, anon, authenticated;

create or replace function public._central_code(p_chars text)
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select string_agg(seg, '-') from (
    select string_agg(substr(p_chars, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(p_chars)), 1), '') as seg
    from generate_series(1, 4) s, generate_series(1, 4) i group by s
  ) x;
$$;
revoke all on function public._central_code(text) from public, anon, authenticated;

create or replace function public.central_admin(p_secret text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  -- Configuration propre à ce logiciel (table central_bridge, voir fin du fichier).
  cfg constant jsonb := (select config from public.central_bridge where id = 1);
  p jsonb := coalesce(p_payload, '{}'::jsonb);
  actor text := left(coalesce(nullif(p->>'_actor', ''), 'opticentral'), 120);
  code_col text := cfg->>'code_col';
  plan_col text := cfg->>'plan_col';
  user_auth_col text := cfg->>'user_auth_col';
  lic_deny text[] := array['id','created_at','updated_at','stripe_customer_id','stripe_subscription_id','stripe_price_id','last_stripe_sync_at', cfg->>'code_col'];
  feat_deny text[] := array['id','license_id','created_at','updated_at'];
  user_deny text[] := array['id','license_id','created_at','updated_at','invited_by', cfg->>'user_auth_col'];
  v_id uuid;
  v_lic jsonb;
  r jsonb;
  n int;
  v_code text;
  v_ident text;
  v_plan text;
  v_email text;
  v_free boolean;
  lim int := least(greatest(coalesce((p->>'limit')::int, 100), 1), 500);
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '28000';
  end if;

  case p_action
  when 'ping' then
    return jsonb_build_object('ok', true, 'app', cfg->>'app', 'version', 1, 'at', now(), 'roles', cfg->'roles', 'plans', cfg->'plans', 'default_plan', cfg->>'default_plan');

  when 'stats' then
    execute format($q$
      select jsonb_build_object(
        'licenses', (select count(*) from licenses),
        'active_licenses', (select count(*) from licenses where is_active),
        'new_licenses_30d', (select count(*) from licenses where created_at > now() - interval '30 days'),
        'users', (select count(*) from company_users),
        'active_users', (select count(*) from company_users where is_active),
        'logins_7d', (select count(*) from %1$I where %2$I > now() - interval '7 days' and success),
        'failed_logins_7d', (select count(*) from %1$I where %2$I > now() - interval '7 days' and not success),
        'last_login_at', (select max(%2$I) from %1$I where success))$q$,
      cfg->>'login_table', cfg->>'login_at') into r;
    if cfg->>'requests' = 'true' then
      r := r || jsonb_build_object('pending_requests', (select count(*) from access_requests where status = 'pending'));
    else
      r := r || jsonb_build_object('pending_requests', 0);
    end if;
    return r;

  when 'list_licenses' then
    execute format($q$
      select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
        select (to_jsonb(l) - 'company_details') || jsonb_build_object(
          '_code', l.%1$I, '_plan', l.%2$I,
          '_users', (select count(*) from company_users u where u.license_id = l.id),
          '_last_login', (select max(h.%4$I) from %3$I h where h.license_id = l.id and h.success)) as x
        from licenses l
        where $1 is null or l.company_name ilike '%%' || $1 || '%%' or l.email ilike '%%' || $1 || '%%'
           or l.siren = $1 or l.%1$I ilike $1 or l.company_identifier ilike $1
      ) s$q$, code_col, plan_col, cfg->>'login_table', cfg->>'login_at')
      into r using nullif(trim(p->>'search'), '');
    return r;

  when 'get_license' then
    v_id := (p->>'id')::uuid;
    execute format('select to_jsonb(l) || jsonb_build_object(''_code'', l.%I, ''_plan'', l.%I) from licenses l where id = $1', code_col, plan_col)
      into v_lic using v_id;
    if v_lic is null then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    r := jsonb_build_object('license', v_lic,
      'license_fields', public._central_fields('licenses', lic_deny),
      'user_fields', public._central_fields('company_users', user_deny),
      'users', (select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at), '[]'::jsonb) from company_users u where u.license_id = v_id),
      'addons', '[]'::jsonb);
    if to_regclass('public.license_addons') is not null then
      execute 'select coalesce(jsonb_agg(to_jsonb(a)), ''[]''::jsonb) from public.license_addons a where a.license_id = $1' into v_lic using v_id;
      r := r || jsonb_build_object('addons', v_lic);
    end if;
    if cfg->>'features_mode' = 'row' then
      r := r || jsonb_build_object('features_mode', 'row',
        'features', (select to_jsonb(f) from license_features f where f.license_id = v_id limit 1),
        'feature_fields', public._central_fields('license_features', feat_deny));
    else
      r := r || jsonb_build_object('features_mode', 'rows',
        'features', (select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'category', d.category,
            'is_enabled', coalesce(f.is_enabled, false), 'limit_value', f.limit_value) order by d.sort_order), '[]'::jsonb)
          from features d left join license_features f on f.license_id = v_id and f.feature_code = d.code));
    end if;
    execute format($q$select coalesce(jsonb_agg(to_jsonb(h) order by h.%2$I desc), '[]'::jsonb)
      from (select * from %1$I where license_id = $1 order by %2$I desc limit 50) h$q$, cfg->>'login_table', cfg->>'login_at')
      into v_lic using v_id;
    return r || jsonb_build_object('logins', v_lic, 'roles', cfg->'roles', 'plans', (select jsonb_agg(k) from jsonb_object_keys(cfg->'plans') k));

  when 'update_license' then
    v_id := (p->>'id')::uuid;
    n := public._central_patch('licenses', 'id', v_id, p->'patch', lic_deny);
    if n = 0 then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    perform public._central_log(cfg, actor, 'central_update_license', v_id, p->'patch');
    return jsonb_build_object('ok', true);

  when 'update_features' then
    v_id := (p->>'license_id')::uuid;
    if not exists (select 1 from licenses where id = v_id) then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    if cfg->>'features_mode' = 'row' then
      insert into license_features (license_id) select v_id where not exists (select 1 from license_features where license_id = v_id);
      perform public._central_patch('license_features', 'license_id', v_id, p->'patch', feat_deny);
    else
      for v_code, r in select key, value from jsonb_each(coalesce(p->'patch', '{}'::jsonb)) loop
        if not exists (select 1 from features where code = v_code) then raise exception 'Fonctionnalité inconnue : %', v_code using errcode = '22023'; end if;
        insert into license_features (license_id, feature_code, is_enabled, limit_value, enabled_at, disabled_at)
        values (v_id, v_code, coalesce((r->>'is_enabled')::boolean, false), (r->>'limit_value')::int,
                now(), case when not coalesce((r->>'is_enabled')::boolean, false) then now() end)
        on conflict (license_id, feature_code) do update set
          is_enabled = coalesce((r->>'is_enabled')::boolean, license_features.is_enabled),
          limit_value = case when r ? 'limit_value' then (r->>'limit_value')::int else license_features.limit_value end,
          enabled_at = case when (r->>'is_enabled')::boolean then now() else license_features.enabled_at end,
          disabled_at = case when (r->>'is_enabled')::boolean = false then now() else license_features.disabled_at end,
          updated_at = now();
      end loop;
    end if;
    perform public._central_log(cfg, actor, 'central_update_features', v_id, p->'patch');
    return jsonb_build_object('ok', true);

  when 'add_user' then
    v_id := (p->>'license_id')::uuid;
    v_email := lower(trim(p->>'email'));
    if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
    if not exists (select 1 from licenses where id = v_id) then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    if exists (select 1 from company_users where license_id = v_id and lower(email) = v_email) then
      raise exception 'Cet email existe déjà pour cette société' using errcode = '23505';
    end if;
    execute format($q$insert into company_users (license_id, email, display_name, role, is_active, invited_at)
      values ($1, $2, $3, (jsonb_populate_record(null::company_users, jsonb_build_object('role', $4))).role, true, now()) returning to_jsonb(company_users)$q$)
      into r using v_id, v_email, nullif(trim(p->>'display_name'), ''), coalesce(nullif(p->>'role', ''), cfg->>'default_role');
    perform public._central_log(cfg, actor, 'central_add_user', v_id, jsonb_build_object('email', v_email, 'role', p->>'role'));
    return r;

  when 'update_user' then
    v_id := (p->>'id')::uuid;
    n := public._central_patch('company_users', 'id', v_id, p->'patch', user_deny);
    if n = 0 then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
    perform public._central_log(cfg, actor, 'central_update_user', v_id, p->'patch');
    return jsonb_build_object('ok', true);

  when 'delete_user' then
    v_id := (p->>'id')::uuid;
    delete from company_users where id = v_id returning email into v_email;
    if v_email is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
    perform public._central_log(cfg, actor, 'central_delete_user', v_id, jsonb_build_object('email', v_email));
    return jsonb_build_object('ok', true);

  when 'create_license' then
    v_email := lower(trim(p->>'email'));
    if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
    if coalesce(trim(p->>'company_name'), '') = '' then raise exception 'Nom de société obligatoire' using errcode = '22023'; end if;
    if nullif(p->>'siren', '') is not null and exists (select 1 from licenses where siren = p->>'siren') then
      raise exception 'Une licence existe déjà pour ce SIREN' using errcode = '23505';
    end if;
    v_plan := coalesce(nullif(p->>'plan', ''), cfg->>'default_plan');
    if not (cfg->'plans' ? v_plan) then raise exception 'Forfait inconnu : %', v_plan using errcode = '22023'; end if;
    loop
      v_code := public._central_code(cfg->>'code_chars');
      execute format('select not exists (select 1 from licenses where %I = $1)', code_col) into v_free using v_code;
      exit when v_free;
    end loop;
    loop
      v_ident := upper(left(regexp_replace(public.company_slugify(p->>'company_name'), '-', '', 'g'), 8))
        || '-' || upper(substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 4));
      exit when not exists (select 1 from licenses where lower(company_identifier) = lower(v_ident));
    end loop;
    -- Champs saisis + valeurs du forfait ; le code et l'identifiant sont générés ici.
    r := (cfg->'plans'->v_plan->'license')
      || (coalesce(p->'fields', '{}'::jsonb) - lic_deny)
      || jsonb_build_object(code_col, v_code, 'company_identifier', v_ident, 'email', v_email,
           'company_name', trim(p->>'company_name'), plan_col, v_plan, 'is_active', true, 'activated_at', now());
    if nullif(p->>'siren', '') is not null then r := r || jsonb_build_object('siren', p->>'siren'); end if;
    select jsonb_object_agg(e.key, e.value) into r from jsonb_each(r) e
      where e.key in (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'licenses');
    execute format('insert into licenses (%s) select %s from jsonb_populate_record(null::licenses, $1) returning id',
      (select string_agg(quote_ident(k), ',') from jsonb_object_keys(r) k),
      (select string_agg(quote_ident(k), ',') from jsonb_object_keys(r) k)) into v_id using r;
    if cfg->>'features_mode' = 'row' then
      r := (cfg->'plans'->v_plan->'features') || jsonb_build_object('license_id', v_id);
      select jsonb_object_agg(e.key, e.value) into r from jsonb_each(r) e
        where e.key in (select column_name from information_schema.columns where table_schema = 'public' and table_name = 'license_features');
      execute format('insert into license_features (%s) select %s from jsonb_populate_record(null::license_features, $1)',
        (select string_agg(quote_ident(k), ',') from jsonb_object_keys(r) k),
        (select string_agg(quote_ident(k), ',') from jsonb_object_keys(r) k)) using r;
    else
      insert into license_features (license_id, feature_code, is_enabled, limit_value, disabled_at)
      select v_id, d.code, (cfg->'plans'->v_plan->'features') ? d.code, null,
             case when (cfg->'plans'->v_plan->'features') ? d.code then null else now() end
      from features d;
    end if;
    execute format($q$insert into company_users (license_id, email, display_name, role, is_active, invited_at)
      values ($1, $2, $3, (jsonb_populate_record(null::company_users, '{"role":"direction"}')).role, true, now())$q$)
      using v_id, v_email, nullif(trim(concat_ws(' ', p->'fields'->>'first_name', p->'fields'->>'last_name')), '');
    perform public._central_log(cfg, actor, 'central_create_license', v_id,
      jsonb_build_object('company_name', p->>'company_name', 'siren', p->>'siren', 'plan', v_plan, 'email', v_email));
    return public.central_admin(p_secret, 'get_license', jsonb_build_object('id', v_id));

  when 'logins' then
    execute format($q$
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('at', h.%2$I, 'license_id', h.license_id, 'company_name', l.company_name,
          'code', l.%3$I, 'success', h.success, 'ip', h.ip_address, 'device', h.device_type,
          'email', to_jsonb(h)->>'email', 'error', to_jsonb(h)->>'error_message') as x
        from %1$I h left join licenses l on l.id = h.license_id
        where $1 is null or h.license_id = $1
        order by h.%2$I desc limit $2) s$q$, cfg->>'login_table', cfg->>'login_at', code_col)
      into r using (p->>'license_id')::uuid, lim;
    return r;

  when 'requests' then
    if cfg->>'requests' <> 'true' then return '[]'::jsonb; end if;
    select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) into r from (
      select to_jsonb(a) || jsonb_build_object('email', u.email, 'display_name', u.display_name,
        'company_name', l.company_name, 'license_id', coalesce(a.license_id, u.license_id)) as x
      from access_requests a
      left join company_users u on u.id = a.company_user_id
      left join licenses l on l.id = coalesce(a.license_id, u.license_id)
      order by a.created_at desc limit lim) s;
    return r;

  when 'process_request' then
    if cfg->>'requests' <> 'true' then raise exception 'Pas de demandes dans ce logiciel' using errcode = '22023'; end if;
    if p->>'status' not in ('approved', 'rejected', 'pending') then raise exception 'Statut invalide' using errcode = '22023'; end if;
    update access_requests set status = p->>'status', admin_comment = nullif(p->>'admin_comment', ''),
      processed_by = actor, processed_at = now(), updated_at = now()
    where id = (p->>'id')::uuid returning id into v_id;
    if v_id is null then raise exception 'Demande introuvable' using errcode = 'P0002'; end if;
    perform public._central_log(cfg, actor, 'central_process_request', v_id, jsonb_build_object('status', p->>'status'));
    return jsonb_build_object('ok', true);

  when 'audit' then
    execute format($q$select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (select * from %I order by created_at desc limit $1) a$q$, cfg->>'audit_table') into r using lim;
    return r;

  else
    raise exception 'Action inconnue : %', p_action using errcode = '22023';
  end case;
end;
$fn$;

-- Journal d'administration du logiciel (chaque action faite depuis OptiCentral y est tracée).
create or replace function public._central_log(cfg jsonb, p_actor text, p_action text, p_target uuid, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if cfg->>'audit_style' = 'fret' then
    insert into admin_audit_logs (admin_action, target_type, target_id, target_email, details)
    values (p_action, 'opticentral', p_target, p_actor, coalesce(p_details, '{}'::jsonb));
  elsif cfg->>'audit_style' = 'xpress' then
    insert into admin_audit_log (admin_email, action, target_type, target_id, details)
    values (p_actor, p_action, 'opticentral', p_target::text, coalesce(p_details, '{}'::jsonb));
  else
    insert into admin_audit_log (admin_email, action, target_id, details)
    values (p_actor, p_action, p_target::text, coalesce(p_details, '{}'::jsonb));
  end if;
exception when others then
  null; -- le journal ne doit jamais bloquer une action
end;
$$;
revoke all on function public._central_log(jsonb, text, text, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.central_admin(text, text, jsonb) from public;
grant execute on function public.central_admin(text, text, jsonb) to anon, authenticated;

-- Configuration propre à optiflow (noms de colonnes, forfaits et réglages par défaut).
insert into public.central_bridge (id, config) values (1, '{"app": "optiflow", "code_col": "license_code", "plan_col": "plan_type", "user_auth_col": "user_id", "login_table": "login_history", "login_at": "login_at", "features_mode": "row", "requests": "true", "audit_table": "admin_audit_log", "audit_style": "flow", "code_chars": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", "default_role": "exploitation", "roles": ["direction", "exploitation", "comptabilite", "rh"], "default_plan": "optiflow", "plans": {"optiflow": {"license": {"max_users": 999}, "features": {"basic_calculator": true, "itinerary_planning": true, "dashboard_basic": true, "dashboard_analytics": true, "forecast": true, "trip_history": true, "multi_drivers": true, "cost_analysis": true, "cost_analysis_basic": true, "margin_alerts": true, "dynamic_charts": true, "pdf_export_pro": true, "excel_export": true, "monthly_tracking": true, "auto_pricing": true, "auto_pricing_basic": true, "saved_tours": true, "client_analysis_basic": true, "ai_optimization": true, "ai_pdf_analysis": true, "multi_agency": true, "tms_erp_integration": true, "multi_users": true, "unlimited_vehicles": true, "client_analysis": true, "smart_quotes": true}}}}'::jsonb)
on conflict (id) do update set config = excluded.config, updated_at = now();
