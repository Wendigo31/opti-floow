-- Équipe gérée dans le logiciel (Direction / RH), suivi du forfait par OptiCentral.
-- Identique dans OptiFlow, OptiFret et OptiXpress. Rejouable sans risque.
-- Nécessite user_accounts.sql (mots de passe provisoires).

alter table public.company_users add column if not exists created_via text;   -- direction | rh | opticentral
alter table public.company_users add column if not exists created_by text;    -- email de la personne qui a créé l'accès
alter table public.licenses add column if not exists licence_copies integer;  -- copies conformes de la licence de transport
alter table public.licenses add column if not exists licence_copies_updated_at timestamptz;

-- Rôle de l'utilisateur connecté dans la société (null s'il n'en fait pas partie).
create or replace function public._my_role_in(p_license_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_role text;
begin
  if auth.uid() is null then return null; end if;
  execute format('select role::text from public.company_users where license_id = $1 and %I = $2 and coalesce(is_active, true) limit 1', auth_col)
    into v_role using p_license_id, auth.uid();
  return v_role;
end;
$$;
revoke all on function public._my_role_in(uuid) from public, anon, authenticated;

-- Membres de la société (pour l'écran Équipe).
create or replace function public.company_team(p_license_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if public._my_role_in(p_license_id) is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'display_name', u.display_name, 'role', u.role::text, 'is_active', coalesce(u.is_active, true),
      'login_id', u.login_id, 'must_change_password', u.must_change_password, 'last_activity_at', u.last_activity_at,
      'created_at', u.created_at, 'created_via', u.created_via, 'created_by', u.created_by)
      order by (u.role::text = 'direction') desc, u.display_name nulls last, u.email), '[]'::jsonb)
    into r from public.company_users u where u.license_id = p_license_id;
  return jsonb_build_object('users', r, 'max_users', (select max_users from public.licenses where id = p_license_id),
    'my_role', public._my_role_in(p_license_id));
end;
$$;
revoke all on function public.company_team(uuid) from public, anon;
grant execute on function public.company_team(uuid) to authenticated;

-- Direction ou RH : crée un accès avec un mot de passe provisoire (renvoyé une seule fois).
create or replace function public.company_create_user(p_license_id uuid, p_email text, p_display_name text, p_role text, p_login_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role text := public._my_role_in(p_license_id);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_login text := nullif(trim(coalesce(p_login_id, '')), '');
  v_max int;
  v_count int;
  v_id uuid;
  v_pwd text;
begin
  if v_my_role is null or v_my_role not in ('direction', 'rh') then
    raise exception 'Réservé à la Direction et aux RH de la société' using errcode = '42501';
  end if;
  if p_role not in ('direction', 'exploitation', 'comptabilite', 'rh') then raise exception 'Rôle inconnu' using errcode = '22023'; end if;
  if p_role = 'direction' and v_my_role <> 'direction' then
    raise exception 'Seule la Direction peut créer un accès Direction' using errcode = '42501';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
  if v_login is not null and v_login !~ '^[A-Za-z0-9._-]{3,40}$' then
    raise exception 'Identifiant : 3 à 40 caractères (lettres, chiffres, point, tiret)' using errcode = '22023';
  end if;
  if exists (select 1 from public.company_users where license_id = p_license_id and lower(email) = v_email) then
    raise exception 'Cet email a déjà un accès dans la société' using errcode = '23505';
  end if;
  if v_login is not null and exists (select 1 from public.company_users where lower(login_id) = lower(v_login)) then
    raise exception 'Cet identifiant est déjà pris' using errcode = '23505';
  end if;
  select max_users into v_max from public.licenses where id = p_license_id;
  select count(*) into v_count from public.company_users where license_id = p_license_id and coalesce(is_active, true);
  if v_max is not null and v_max > 0 and v_count >= v_max then
    raise exception 'Limite de % utilisateurs du forfait atteinte : contactez OptiGroup pour l''augmenter', v_max using errcode = '23514';
  end if;
  perform set_config('app.admin_context', 'true', true);
  execute $q$insert into public.company_users (license_id, email, display_name, role, is_active, invited_at, login_id, created_via, created_by)
      values ($1, $2, $3, (jsonb_populate_record(null::public.company_users, jsonb_build_object('role', $4))).role, true, now(), $5, $6, $7)
      returning id$q$
    into v_id using p_license_id, v_email, nullif(trim(coalesce(p_display_name, '')), ''), p_role, v_login, v_my_role,
      coalesce(auth.jwt()->>'email', '');
  v_pwd := public._company_temp_password(v_id);
  return jsonb_build_object('id', v_id, 'password', v_pwd);
end;
$$;
revoke all on function public.company_create_user(uuid, text, text, text, text) from public, anon;
grant execute on function public.company_create_user(uuid, text, text, text, text) to authenticated;

-- Direction ou RH : active / désactive un accès (pas le sien).
create or replace function public.company_set_user_active(p_company_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_license uuid;
  v_role text;
  v_self boolean;
  v_my_role text;
begin
  select license_id, role::text into v_license, v_role from public.company_users where id = p_company_user_id;
  if v_license is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  v_my_role := public._my_role_in(v_license);
  if v_my_role is null or v_my_role not in ('direction', 'rh') then
    raise exception 'Réservé à la Direction et aux RH de la société' using errcode = '42501';
  end if;
  if v_role = 'direction' and v_my_role <> 'direction' then
    raise exception 'Seule la Direction peut modifier un accès Direction' using errcode = '42501';
  end if;
  execute format('select %I = auth.uid() from public.company_users where id = $1', auth_col) into v_self using p_company_user_id;
  if coalesce(v_self, false) then raise exception 'Vous ne pouvez pas désactiver votre propre accès' using errcode = '22023'; end if;
  perform set_config('app.admin_context', 'true', true);
  update public.company_users set is_active = p_active, updated_at = now() where id = p_company_user_id;
end;
$$;
revoke all on function public.company_set_user_active(uuid, boolean) from public, anon;
grant execute on function public.company_set_user_active(uuid, boolean) to authenticated;
