-- Paramètres communs aux logiciels Opti (fichier partagé : bridge/shared/settings).
-- 1) Préférences de la société (taux de TVA par défaut…) ;
-- 2) préférences de chaque membre (être prévenu des modifications de l'équipe) ;
-- 3) historique des modifications : qui a modifié quoi, sans les valeurs (RGPD) ;
-- 4) export complet des données de la société (fichier .opp).
-- Variables : optiflow (optifret|optiflow|optixpress), public.get_user_license_id(auth.uid()) (licence de l'utilisateur
-- connecté), user_id (colonne de company_users liée à auth.users), array['planning_entries','Planning'], array['saved_tours','Tournée'], array['trips','Trajet'], array['quotes','Devis'], array['clients','Client'], array['client_rate_cards','Grille tarifaire'], array['invoices','Facture'], array['invoice_settings','Réglages de facturation'], array['user_charges','Charge'], array['user_drivers','Conducteur'], array['driver_absences','Absence'], array['user_vehicles','Véhicule'], array['user_trailers','Remorque'], array['pallet_movements','Palettes'], array['company_users','Équipe'], array['company_settings','Réglages société']
-- (tables suivies, avec leur libellé).

-- ---------------------------------------------------------------------------
-- Qui est connecté, dans quelle société
-- ---------------------------------------------------------------------------
create or replace function public._opti_me()
returns table(license_id uuid, member_id uuid, role text, name text, email text)
language sql stable security definer set search_path = public as $$
  select cu.license_id, cu.id, cu.role::text, coalesce(nullif(trim(cu.display_name), ''), cu.email), cu.email
    from public.company_users cu
   where cu.user_id = auth.uid() and cu.license_id = public.get_user_license_id(auth.uid()) and coalesce(cu.is_active, true)
   limit 1;
$$;
revoke all on function public._opti_me() from public, anon;
grant execute on function public._opti_me() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Préférences de la société
-- ---------------------------------------------------------------------------
create table if not exists public.opti_company_preferences (
  license_id uuid primary key references public.licenses(id) on delete cascade,
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0 and vat_rate <= 30),
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.opti_company_preferences enable row level security;
revoke all on public.opti_company_preferences from anon, authenticated;

create or replace function public.opti_get_settings()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; c public.opti_company_preferences; m jsonb;
begin
  select * into me from public._opti_me();
  if me.license_id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  select * into c from public.opti_company_preferences where license_id = me.license_id;
  select to_jsonb(p) - 'license_id' - 'member_id' into m from public.opti_member_preferences p
   where p.license_id = me.license_id and p.member_id = me.member_id;
  return jsonb_build_object(
    'vat_rate', coalesce(c.vat_rate, 20),
    'vat_updated_by', c.updated_by, 'vat_updated_at', c.updated_at,
    'me', jsonb_build_object('id', me.member_id, 'name', me.name, 'email', me.email, 'role', me.role),
    'can_edit_company', me.role in ('direction', 'comptabilite'),
    'member', coalesce(m, jsonb_build_object('notify_team_changes', true)));
end $$;
revoke all on function public.opti_get_settings() from public, anon;
grant execute on function public.opti_get_settings() to authenticated;

create or replace function public.opti_set_vat_rate(p_rate numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from public._opti_me();
  if me.license_id is null or me.role not in ('direction', 'comptabilite') then
    raise exception 'Réservé à la Direction et à la Comptabilité' using errcode = '42501';
  end if;
  if p_rate is null or p_rate < 0 or p_rate > 30 then
    raise exception 'Taux de TVA invalide (entre 0 et 30 %%)' using errcode = '22023';
  end if;
  insert into public.opti_company_preferences (license_id, vat_rate, updated_by, updated_at)
  values (me.license_id, round(p_rate, 2), me.name, now())
  on conflict (license_id) do update set vat_rate = excluded.vat_rate, updated_by = excluded.updated_by, updated_at = now();
  return round(p_rate, 2);
end $$;
revoke all on function public.opti_set_vat_rate(numeric) from public, anon;
grant execute on function public.opti_set_vat_rate(numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Préférences de chaque membre
-- ---------------------------------------------------------------------------
create table if not exists public.opti_member_preferences (
  license_id uuid not null references public.licenses(id) on delete cascade,
  member_id uuid not null,
  notify_team_changes boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (license_id, member_id)
);
alter table public.opti_member_preferences enable row level security;
revoke all on public.opti_member_preferences from anon, authenticated;

create or replace function public.opti_set_member_preferences(p_prefs jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from public._opti_me();
  if me.license_id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  insert into public.opti_member_preferences (license_id, member_id, notify_team_changes, updated_at)
  values (me.license_id, me.member_id, coalesce((p_prefs->>'notify_team_changes')::boolean, true), now())
  on conflict (license_id, member_id) do update
     set notify_team_changes = coalesce((p_prefs->>'notify_team_changes')::boolean, opti_member_preferences.notify_team_changes),
         updated_at = now();
  return public.opti_get_settings()->'member';
end $$;
revoke all on function public.opti_set_member_preferences(jsonb) from public, anon;
grant execute on function public.opti_set_member_preferences(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Historique des modifications de l'équipe
-- ---------------------------------------------------------------------------
create table if not exists public.opti_team_activity (
  id bigint generated always as identity primary key,
  license_id uuid not null references public.licenses(id) on delete cascade,
  member_id uuid,
  actor_name text not null,
  action text not null check (action in ('create', 'update', 'delete')),
  entity text not null,
  entity_label text,
  fields text[] not null default '{}',
  row_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opti_team_activity_license_idx on public.opti_team_activity (license_id, updated_at desc);
alter table public.opti_team_activity enable row level security;
revoke all on public.opti_team_activity from anon, authenticated;

-- Libellé lisible d'une ligne (nom, numéro, immatriculation…), y compris dans les données JSON.
create or replace function public._opti_row_label(j jsonb)
returns text language plpgsql immutable as $$
declare k text; v jsonb; out text;
begin
  foreach k in array array['name', 'company_name', 'invoice_number', 'number', 'quote_number', 'tour_name',
                           'reference', 'license_plate', 'licensePlate', 'plate', 'registration', 'title', 'email', 'key'] loop
    out := nullif(trim(j->>k), '');
    if out is not null then return left(out, 120); end if;
  end loop;
  for k, v in select * from jsonb_each(j) loop
    if jsonb_typeof(v) = 'object' then
      out := coalesce(nullif(trim(v->>'name'), ''), nullif(trim(v->>'licensePlate'), ''), nullif(trim(v->>'plate'), ''));
      if out is not null then return left(out, 120); end if;
    end if;
  end loop;
  return null;
end $$;

-- Noms des champs modifiés (jamais les valeurs), y compris un niveau dans les données JSON.
create or replace function public._opti_changed_fields(o jsonb, n jsonb)
returns text[] language plpgsql immutable as $$
declare k text; res text[] := '{}'; sk text;
  noise constant text[] := array['updated_at', 'synced_at', 'created_at', 'last_activity_at', 'last_used_at',
                                 'last_login_at', 'last_seen_at', 'version', 'id', 'license_id', 'user_id', 'auth_user_id'];
begin
  for k in select key from jsonb_each(n) union select key from jsonb_each(o) loop
    if k = any(noise) then continue; end if;
    if (o->k) is distinct from (n->k) then
      if jsonb_typeof(n->k) = 'object' and jsonb_typeof(o->k) = 'object' then
        for sk in select key from jsonb_each(n->k) union select key from jsonb_each(o->k) loop
          if sk = any(noise) or sk in ('updatedAt', 'syncedAt', 'createdAt') then continue; end if;
          if (o->k->sk) is distinct from (n->k->sk) then res := res || sk; end if;
        end loop;
      else
        res := res || k;
      end if;
    end if;
  end loop;
  return res[1:12];
end $$;

create or replace function public._opti_log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_license uuid; v_member uuid; v_name text; v_action text; v_fields text[] := '{}'; v_key text; v_last public.opti_team_activity;
begin
  if auth.uid() is null or coalesce(current_setting('app.admin_context', true), '') = 'true' then return null; end if;
  v_license := nullif(j->>'license_id', '')::uuid;
  if v_license is null then return null; end if;
  execute format('select id, coalesce(nullif(trim(display_name), %L), email) from public.company_users where license_id = $1 and %I = $2 limit 1', '', 'user_id')
    into v_member, v_name using v_license, auth.uid();
  if v_member is null then return null; end if;           -- conducteur, support, système : pas un membre de l'équipe
  v_action := case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end;
  if tg_op = 'UPDATE' then
    v_fields := public._opti_changed_fields(o, j);
    if coalesce(array_length(v_fields, 1), 0) = 0 then return null; end if;   -- synchronisation sans changement
  end if;
  v_key := coalesce(j->>'id', j->>'local_id', '');
  -- Plusieurs enregistrements rapprochés de la même ligne par la même personne : une seule entrée.
  select * into v_last from public.opti_team_activity a
   where a.license_id = v_license and a.member_id = v_member and a.entity = tg_argv[0] and a.row_key = v_key
     and a.updated_at > now() - interval '10 minutes'
   order by a.updated_at desc limit 1;
  if v_last.id is not null and v_action = 'update' then
    update public.opti_team_activity
       set fields = (select coalesce(array_agg(distinct f), '{}') from unnest(v_last.fields || v_fields) f),
           entity_label = coalesce(public._opti_row_label(j), entity_label), updated_at = now()
     where id = v_last.id;
    return null;
  end if;
  insert into public.opti_team_activity (license_id, member_id, actor_name, action, entity, entity_label, fields, row_key)
  values (v_license, v_member, coalesce(v_name, 'Un membre'), v_action, tg_argv[0], public._opti_row_label(j), v_fields, v_key);
  return null;
exception when others then
  return null;   -- l'historique ne doit jamais bloquer une saisie
end $$;

do $$
declare t text[];
begin
  foreach t slice 1 in array array[array['planning_entries','Planning'], array['saved_tours','Tournée'], array['trips','Trajet'], array['quotes','Devis'], array['clients','Client'], array['client_rate_cards','Grille tarifaire'], array['invoices','Facture'], array['invoice_settings','Réglages de facturation'], array['user_charges','Charge'], array['user_drivers','Conducteur'], array['driver_absences','Absence'], array['user_vehicles','Véhicule'], array['user_trailers','Remorque'], array['pallet_movements','Palettes'], array['company_users','Équipe'], array['company_settings','Réglages société']] loop
    if to_regclass('public.' || t[1]) is not null then
      execute format('drop trigger if exists opti_activity on public.%I', t[1]);
      execute format('create trigger opti_activity after insert or update or delete on public.%I for each row execute function public._opti_log_activity(%L)', t[1], t[2]);
    end if;
  end loop;
end $$;

-- Historique (filtrable par membre) ; nouveautés depuis un instant donné pour les notifications.
create or replace function public.opti_team_activity(p_member uuid default null, p_since timestamptz default null, p_limit int default 200)
returns setof public.opti_team_activity language plpgsql stable security definer set search_path = public as $$
declare me record;
begin
  select * into me from public._opti_me();
  if me.license_id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  return query
    select * from public.opti_team_activity a
     where a.license_id = me.license_id
       and (p_member is null or a.member_id = p_member)
       and (p_since is null or a.updated_at > p_since)
     order by a.updated_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 500);
end $$;
revoke all on function public.opti_team_activity(uuid, timestamptz, int) from public, anon;
grant execute on function public.opti_team_activity(uuid, timestamptz, int) to authenticated;

create or replace function public.opti_team_members()
returns table(member_id uuid, name text, role text, is_me boolean) language plpgsql stable security definer set search_path = public as $$
declare me record;
begin
  select * into me from public._opti_me();
  if me.license_id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  return query select cu.id, coalesce(nullif(trim(cu.display_name), ''), cu.email)::text, cu.role::text, cu.id = me.member_id
                 from public.company_users cu where cu.license_id = me.license_id order by 2;
end $$;
revoke all on function public.opti_team_members() from public, anon;
grant execute on function public.opti_team_members() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Export complet des données de la société
-- ---------------------------------------------------------------------------
-- Colonnes jamais exportées (secrets, codes d'accès).
create or replace function public._opti_strip_secrets(j jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(j)
   where key !~* '(password|secret|token|pin_code|pincode|_hash$|activation_code|api_key|stripe_)';
$$;

create or replace function public._opti_export(p_license uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t text; rows jsonb; out jsonb := '{}'::jsonb; lic jsonb;
  -- Tables techniques (sessions, statistiques, journaux de connexion) : pas des données de la société.
  skip constant text[] := array['licenses', 'central_bridge', 'central_announcements', 'support_sessions', 'support_threads',
    'active_demo_sessions', 'active_itinerary_sessions', 'user_sessions', 'driver_portal_sessions', 'search_history',
    'page_usage', 'usage_stats', 'driver_live_positions', 'access_requests', 'client_errors', 'driver_app_errors',
    'license_features', 'license_addons', 'license_visibility_settings', 'company_sync_events', 'login_history',
    'license_login_history', 'invoice_counters', 'driver_access_links', 'delivery_tracking_links',
    'quote_acceptance_links', 'company_invitations', 'freight_shares'];
begin
  select public._opti_strip_secrets(to_jsonb(l)) into lic from public.licenses l where l.id = p_license;
  if lic is null then raise exception 'Société introuvable' using errcode = 'P0002'; end if;
  for t in
    select c.table_name::text from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.column_name = 'license_id' and c.table_name <> all(skip)
     order by 1
  loop
    execute format('select coalesce(jsonb_agg(public._opti_strip_secrets(to_jsonb(x))), ''[]''::jsonb) from public.%I x where x.license_id = $1', t)
      into rows using p_license;
    if rows <> '[]'::jsonb then out := out || jsonb_build_object(t, rows); end if;
  end loop;
  return jsonb_build_object('app', 'optiflow', 'exported_at', now(), 'company', lic, 'tables', out);
end $$;
revoke all on function public._opti_export(uuid) from public, anon, authenticated;

-- Depuis le logiciel : la Direction exporte les données de SA société.
create or replace function public.opti_export_company()
returns jsonb language plpgsql security definer set search_path = public as $$
declare me record; r jsonb;
begin
  select * into me from public._opti_me();
  if me.license_id is null or me.role <> 'direction' then
    raise exception 'L''export des données est réservé à la Direction' using errcode = '42501';
  end if;
  r := public._opti_export(me.license_id);
  insert into public.opti_team_activity (license_id, member_id, actor_name, action, entity, entity_label, fields, row_key)
  values (me.license_id, me.member_id, me.name, 'create', 'Export des données', 'Fichier .opp', '{}', 'export');
  return r || jsonb_build_object('exported_by', me.name);
end $$;
revoke all on function public.opti_export_company() from public, anon;
grant execute on function public.opti_export_company() to authenticated;

-- OptiCentral garde son propre export (central_admin_ext › export_company), qu'il convertit
-- en .opp, CSV, XLSX ou JSON pour l'administrateur.

-- Ménage : historique conservé 13 mois.
delete from public.opti_team_activity where updated_at < now() - interval '13 months';
