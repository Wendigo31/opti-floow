-- Pont OptiCentral v2 (identique dans OptiFlow, OptiFret et OptiXpress)
--   - santé des clients (dernière connexion, utilisateurs jamais connectés, onglets jamais ouverts)
--   - bandeaux d'annonce / maintenance affichés dans le logiciel
--   - suivi des onglets ouverts (page_usage)
--   - export et suppression complète d'une société (RGPD)
--   - applis conducteurs : codes, appareils, dernières positions
--   - suspension automatique des licences impayées (pg_cron, une fois par jour)
-- Même protection que central_admin : clé secrète dont seule l'empreinte est en base.
-- Rejouable sans risque. Ajout : action audit_clear (vider le journal).

-- ---------- Bandeaux d'annonce ----------
create table if not exists public.central_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (length(message) between 1 and 500),
  level text not null default 'info' check (level in ('info', 'warning', 'maintenance')),
  license_id uuid references public.licenses(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.central_announcements enable row level security;
revoke all on public.central_announcements from public, anon, authenticated;

-- Annonces en cours pour une société (toutes sociétés + celles qui la visent).
create or replace function public.active_announcements(p_license_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'message', a.message, 'level', a.level, 'ends_at', a.ends_at)
           order by a.starts_at desc), '[]'::jsonb)
  from public.central_announcements a
  where (a.license_id is null or a.license_id = p_license_id)
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now());
$$;
revoke all on function public.active_announcements(uuid) from public;
grant execute on function public.active_announcements(uuid) to anon, authenticated;

-- ---------- Onglets ouverts ----------
create table if not exists public.page_usage (
  license_id uuid not null references public.licenses(id) on delete cascade,
  path text not null,
  visits integer not null default 0,
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  primary key (license_id, path)
);
alter table public.page_usage enable row level security;
revoke all on public.page_usage from public, anon, authenticated;

create or replace function public.track_page_view(p_license_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_license_id is null or p_path is null or p_path !~ '^/[A-Za-z0-9/_-]{0,80}$' then return; end if;
  if not exists (select 1 from public.licenses where id = p_license_id) then return; end if;
  insert into public.page_usage (license_id, path, visits) values (p_license_id, p_path, 1)
  on conflict (license_id, path) do update set visits = page_usage.visits + 1, last_visited_at = now();
end;
$$;
revoke all on function public.track_page_view(uuid, text) from public;
grant execute on function public.track_page_view(uuid, text) to anon, authenticated;

-- ---------- Suspension automatique des impayés ----------
-- Réglage (config.autosuspend = {"enabled": bool, "days": n}) envoyé par OptiCentral.
-- Une licence dont l'abonnement est impayé (past_due / unpaid) depuis plus de n jours
-- après la fin de période est suspendue ; l'action est tracée dans le journal.
create or replace function public.central_autosuspend()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := coalesce((select config from public.central_bridge where id = 1), '{}'::jsonb);
  col text := coalesce(cfg->>'sub_status_col', 'subscription_status');
  days int := greatest(coalesce((cfg->'autosuspend'->>'days')::int, 15), 1);
  r record;
  n int := 0;
begin
  if coalesce((cfg->'autosuspend'->>'enabled')::boolean, false) is not true then return 0; end if;
  perform set_config('app.admin_context', 'true', true);
  for r in execute format(
    'select id from public.licenses where is_active and lower(coalesce(%I, '''')) in (''past_due'', ''unpaid'')
       and coalesce(current_period_end, now()) < now() - make_interval(days => $1)', col) using days
  loop
    update public.licenses set is_active = false where id = r.id;
    perform public._central_log(cfg, 'opticentral:auto', 'central_autosuspend', r.id, jsonb_build_object('days', days));
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.central_autosuspend() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'central-autosuspend';
  perform cron.schedule('central-autosuspend', '15 3 * * *', 'select public.central_autosuspend()');
exception when others then
  raise notice 'pg_cron indisponible : suspension automatique non planifiée (%)', sqlerrm;
end $$;

-- Réglages propres à chaque logiciel (déduits de la base, rien à adapter à la main).
update public.central_bridge set config = config
  || jsonb_build_object('drivers_mode', replace(config->>'app', 'opti', ''))
  || jsonb_build_object('sub_status_col', case when exists (select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'licenses' and column_name = 'subscription_status')
       then 'subscription_status' else 'stripe_status' end)
where id = 1;

-- Lignes liées à une société sans colonne license_id (ex. factures rattachées à un client) :
-- table enfant, colonne, table parente, colonne parente, suppression en cascade ou non.
create or replace function public._central_child_links()
returns table (child text, col text, parent text, pcol text, cascades boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.conrelid::regclass::text, a.attname::text, c.confrelid::regclass::text, pa.attname::text, c.confdeltype in ('c', 'n', 'd')
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = c.confkey[1]
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 1
    and c.confrelid <> 'public.licenses'::regclass
    and exists (select 1 from information_schema.columns x where x.table_schema = 'public'
                and x.table_name = c.confrelid::regclass::text and x.column_name = 'license_id')
    and not exists (select 1 from information_schema.columns x where x.table_schema = 'public'
                and x.table_name = c.conrelid::regclass::text and x.column_name = 'license_id');
$$;
revoke all on function public._central_child_links() from public, anon, authenticated;

-- ---------- Pont v2 ----------
create or replace function public.central_admin_ext(p_secret text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  cfg jsonb := (select config from public.central_bridge where id = 1);
  p jsonb := coalesce(p_payload, '{}'::jsonb);
  actor text := left(coalesce(nullif(p->>'_actor', ''), 'opticentral'), 120);
  code_col text := cfg->>'code_col';
  auth_col text := cfg->>'user_auth_col';
  mode text := coalesce(cfg->>'drivers_mode', 'flow');
  v_id uuid;
  v_code text;
  v_json jsonb;
  r jsonb;
  t record;
  progress boolean;
  remaining text[];
  users uuid[];
  pass int := 0;
  n_del int;
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '28000';
  end if;
  perform set_config('app.admin_context', 'true', true);

  case p_action

  when 'health' then
    execute format($q$
      select coalesce(jsonb_agg(x order by x->>'company_name'), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', l.id, 'code', l.%1$I, 'company_name', coalesce(l.company_name, l.company_identifier, l.email),
          'siren', l.siren, 'is_active', l.is_active, 'created_at', l.created_at,
          'last_login', greatest((select max(h.%3$I) from %2$I h where h.license_id = l.id and h.success), l.last_used_at),
          'logins_30d', (select count(*) from %2$I h where h.license_id = l.id and h.success and h.%3$I > now() - interval '30 days'),
          'users_total', (select count(*) from company_users u where u.license_id = l.id),
          'users_never', (select coalesce(jsonb_agg(jsonb_build_object('email', u.email, 'role', u.role::text, 'invited_at', u.invited_at)), '[]'::jsonb)
                          from company_users u where u.license_id = l.id and u.last_activity_at is null and u.accepted_at is null and coalesce(u.is_active, true)),
          'pages', (select coalesce(jsonb_object_agg(pu.path, pu.last_visited_at), '{}'::jsonb) from page_usage pu where pu.license_id = l.id),
          'hidden_pages', to_jsonb(coalesce(l.hidden_pages, '{}'::text[])),
          'contact_complete', coalesce(nullif(trim(l.company_phone), ''), '') <> '' and coalesce(nullif(trim(l.company_email), ''), '') <> '')
        as x from licenses l) s$q$, code_col, cfg->>'login_table', cfg->>'login_at') into r;
    return r;

  when 'announcements' then
    select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('company_name', l.company_name) order by a.created_at desc), '[]'::jsonb) into r
    from central_announcements a left join licenses l on l.id = a.license_id
    where a.ends_at is null or a.ends_at > now() - interval '30 days';
    return r;

  when 'announce' then
    insert into central_announcements (message, level, license_id, starts_at, ends_at, created_by)
    values (trim(p->>'message'), coalesce(nullif(p->>'level', ''), 'info'), nullif(p->>'license_id', '')::uuid,
            coalesce(nullif(p->>'starts_at', '')::timestamptz, now()), nullif(p->>'ends_at', '')::timestamptz, actor)
    returning to_jsonb(central_announcements) into r;
    perform _central_log(cfg, actor, 'central_announce', (r->>'id')::uuid, jsonb_build_object('message', p->>'message', 'license_id', p->>'license_id'));
    return r;

  when 'announce_end' then
    update central_announcements set ends_at = now() where id = (p->>'id')::uuid returning id into v_id;
    if v_id is null then raise exception 'Annonce introuvable' using errcode = 'P0002'; end if;
    return jsonb_build_object('ok', true);

  when 'audit_clear' then
    -- Vide le journal d'administration du logiciel ; une ligne garde la trace du vidage.
    execute format('delete from public.%I where true', cfg->>'audit_table');
    get diagnostics n_del = row_count;
    perform _central_log(cfg, actor, 'central_audit_cleared', null, jsonb_build_object('deleted', n_del));
    return jsonb_build_object('deleted', n_del);

  when 'autosuspend_get' then
    return coalesce(cfg->'autosuspend', '{"enabled": false, "days": 15}'::jsonb);

  when 'autosuspend_set' then
    update central_bridge set config = config || jsonb_build_object('autosuspend', jsonb_build_object(
      'enabled', coalesce((p->>'enabled')::boolean, false),
      'days', least(greatest(coalesce((p->>'days')::int, 15), 1), 180))), updated_at = now()
    where id = 1;
    perform _central_log(cfg, actor, 'central_autosuspend_settings', null, p - '_actor');
    return (select config->'autosuspend' from central_bridge where id = 1);

  when 'autosuspend_run' then
    return jsonb_build_object('suspended', public.central_autosuspend());

  when 'export_company' then
    v_id := (p->>'id')::uuid;
    if not exists (select 1 from licenses where id = v_id) then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    r := jsonb_build_object('app', cfg->>'app', 'exported_at', now(),
      'licenses', (select jsonb_agg(to_jsonb(l)) from licenses l where l.id = v_id));
    for t in
      select c.table_name::text as tn from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
      where c.table_schema = 'public' and c.column_name = 'license_id' and c.table_name not in ('licenses', 'central_bridge')
      order by 1
    loop
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.license_id = $1', t.tn)
        into v_json using v_id;
      if v_json <> '[]'::jsonb then r := r || jsonb_build_object(t.tn, v_json); end if;
    end loop;
    for t in select * from public._central_child_links() loop
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.%I in (select p.%I from public.%I p where p.license_id = $1)',
        t.child, t.col, t.pcol, t.parent) into v_json using v_id;
      if v_json <> '[]'::jsonb then r := r || jsonb_build_object(t.child, coalesce(r->t.child, '[]'::jsonb) || v_json); end if;
    end loop;
    perform _central_log(cfg, actor, 'central_export_company', v_id, '{}'::jsonb);
    return r;

  when 'delete_company' then
    v_id := (p->>'id')::uuid;
    execute format('select %I from licenses where id = $1', code_col) into v_code using v_id;
    if v_code is null then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;
    if coalesce(p->>'confirm', '') <> v_code then
      raise exception 'Confirmation incorrecte : saisir le code de licence exact' using errcode = '22023';
    end if;
    execute format('select array_agg(%I) from company_users where license_id = $1 and %I is not null', auth_col, auth_col) into users using v_id;
    select array_agg(c.table_name::text order by c.table_name) into remaining
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'license_id' and c.table_name not in ('licenses', 'central_bridge');
    -- Lignes enfants qui bloqueraient la suppression (pas de cascade).
    for t in select * from public._central_child_links() where not cascades loop
      execute format('delete from public.%I x where x.%I in (select p.%I from public.%I p where p.license_id = $1)',
        t.child, t.col, t.pcol, t.parent) using v_id;
    end loop;
    -- Plusieurs passes : une table référencée par une autre se vide après elle.
    loop
      pass := pass + 1;
      progress := false;
      for t in select unnest(coalesce(remaining, '{}')) as tn loop
        begin
          execute format('delete from public.%I where license_id = $1', t.tn) using v_id;
          remaining := array_remove(remaining, t.tn);
          progress := true;
        exception when foreign_key_violation then null;
        end;
      end loop;
      exit when coalesce(array_length(remaining, 1), 0) = 0 or not progress or pass > 10;
    end loop;
    if coalesce(array_length(remaining, 1), 0) > 0 then
      raise exception 'Suppression impossible, données encore liées dans : %', array_to_string(remaining, ', ');
    end if;
    delete from licenses where id = v_id;
    -- Comptes de connexion qui n'appartiennent à aucune autre société.
    if users is not null then
      begin
        execute format('delete from auth.users au where au.id = any($1) and not exists (select 1 from company_users u where u.%I = au.id)', auth_col) using users;
      exception when others then null;
      end;
    end if;
    perform _central_log(cfg, actor, 'central_delete_company', v_id, jsonb_build_object('code', v_code));
    return jsonb_build_object('ok', true, 'deleted_auth_users', coalesce(array_length(users, 1), 0));

  when 'drivers' then
    v_id := nullif(p->>'license_id', '')::uuid;
    if mode = 'fret' then
      select coalesce(jsonb_agg(x order by x->>'company_name', x->>'name'), '[]'::jsonb) into r from (
        select jsonb_build_object('id', d.id, 'license_id', d.license_id, 'company_name', l.company_name, 'name', d.name,
          'phone', d.phone, 'email', d.email, 'code', dp.pin_code, 'code_active', coalesce(dp.is_active, false),
          'last_seen', dp.last_used_at, 'devices', case when dp.last_used_at is not null then 1 else 0 end,
          'position', d.driver_data->'location', 'status', case when d.available then 'disponible' else 'indisponible' end) x
        from drivers d left join licenses l on l.id = d.license_id left join driver_pins dp on dp.driver_id = d.id
        where v_id is null or d.license_id = v_id) s;
    elsif mode = 'xpress' then
      select coalesce(jsonb_agg(x order by x->>'company_name', x->>'name'), '[]'::jsonb) into r from (
        select jsonb_build_object('id', d.id, 'license_id', d.license_id, 'company_name', l.company_name, 'name', d.name,
          'phone', d.phone, 'email', d.email, 'code', d.pin_code, 'code_active', d.status = 'active', 'status', d.status,
          'devices', (select count(*) from driver_portal_sessions s where s.driver_id = d.id and s.expires_at > now()),
          'last_seen', (select max(s.last_seen_at) from driver_portal_sessions s where s.driver_id = d.id),
          'position', (select jsonb_build_object('lat', pos.latitude, 'lng', pos.longitude, 'accuracy', pos.accuracy, 'updated_at', pos.updated_at)
                       from driver_live_positions pos where pos.driver_id = d.id order by pos.updated_at desc limit 1),
          'errors_7d', (select count(*) from driver_app_errors e where e.driver_id = d.id and e.created_at > now() - interval '7 days')) x
        from user_drivers d left join licenses l on l.id = d.license_id
        where v_id is null or d.license_id = v_id) s;
    else
      select coalesce(jsonb_agg(x order by x->>'company_name', x->>'name'), '[]'::jsonb) into r from (
        select jsonb_build_object('id', d.id, 'license_id', d.license_id, 'company_name', l.company_name, 'name', d.name,
          'status', d.driver_type, 'code', null, 'devices', 0, 'position', null) x
        from user_drivers d left join licenses l on l.id = d.license_id
        where v_id is null or d.license_id = v_id) s;
    end if;
    return r;

  when 'driver_reset_code' then
    v_id := (p->>'driver_id')::uuid;
    if mode = 'fret' then
      loop
        v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
        exit when not exists (select 1 from driver_pins where pin_code = v_code);
      end loop;
      if not exists (select 1 from drivers where id = v_id) then raise exception 'Conducteur introuvable' using errcode = 'P0002'; end if;
      perform public.set_driver_pin(v_id, v_code);
    elsif mode = 'xpress' then
      loop
        v_code := (select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1 + (get_byte(gen_random_bytes(1), 0) % 36), 1), '') from generate_series(1, 6));
        exit when not exists (select 1 from user_drivers where pin_code = v_code);
      end loop;
      update user_drivers set pin_code = v_code, updated_at = now() where id = v_id returning id into v_id;
      if v_id is null then raise exception 'Conducteur introuvable' using errcode = 'P0002'; end if;
      delete from driver_portal_sessions where driver_id = v_id;
    else
      raise exception 'Pas d''application conducteur dans ce logiciel' using errcode = '22023';
    end if;
    perform _central_log(cfg, actor, 'central_driver_reset_code', v_id, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'code', v_code);

  when 'driver_logout' then
    v_id := (p->>'driver_id')::uuid;
    if mode = 'xpress' then
      delete from driver_portal_sessions where driver_id = v_id;
    elsif mode = 'fret' then
      update driver_pins set is_active = false, updated_at = now() where driver_id = v_id;
    else
      raise exception 'Pas d''application conducteur dans ce logiciel' using errcode = '22023';
    end if;
    perform _central_log(cfg, actor, 'central_driver_logout', v_id, '{}'::jsonb);
    return jsonb_build_object('ok', true);

  else
    raise exception 'Action inconnue : %', p_action using errcode = '22023';
  end case;
end;
$fn$;
revoke all on function public.central_admin_ext(text, text, jsonb) from public;
grant execute on function public.central_admin_ext(text, text, jsonb) to anon, authenticated;
