-- Connexion par email (ou identifiant personnel) + mot de passe, identique dans
-- OptiFlow, OptiFret et OptiXpress. Rejouable sans risque.
--
-- Chaque utilisateur a son propre mot de passe. La Direction ou les RH (dans le
-- logiciel) et l'administrateur (dans OptiCentral) lui donnent un mot de passe
-- PROVISOIRE, généré ici ; il doit le remplacer à sa première connexion
-- (company_users.must_change_password).

alter table public.company_users add column if not exists must_change_password boolean not null default false;
alter table public.company_users add column if not exists login_id text;
alter table public.company_users add column if not exists password_set_at timestamptz;
create unique index if not exists company_users_login_id_key on public.company_users (lower(login_id)) where login_id is not null;

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

-- Crée le compte de connexion (ou change son mot de passe s'il existe déjà).
create or replace function public._auth_set_password(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = v_email order by created_at limit 1;
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_uid::text, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now());
  else
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           banned_until = null,
           updated_at = now()
     where id = v_uid;
  end if;
  return v_uid;
end;
$$;
revoke all on function public._auth_set_password(text, text) from public, anon, authenticated;

-- Mot de passe provisoire (10 caractères sans 0/O/1/I/L) pour un utilisateur ; renvoyé une seule fois.
create or replace function public._company_temp_password(p_company_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_email text;
  v_code text;
  v_uid uuid;
begin
  select email into v_email from public.company_users where id = p_company_user_id;
  if v_email is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  v_code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '')
             from generate_series(1, 10));
  v_uid := public._auth_set_password(v_email, v_code);
  perform set_config('app.admin_context', 'true', true);
  execute format('update public.company_users set %I = $1, must_change_password = true, password_set_at = null, updated_at = now() where id = $2', auth_col)
    using v_uid, p_company_user_id;
  return v_code;
end;
$$;
revoke all on function public._company_temp_password(uuid) from public, anon, authenticated;

-- Direction ou RH de la société : donne un mot de passe provisoire à un de ses utilisateurs.
create or replace function public.company_reset_user_password(p_company_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_license uuid;
  v_ok boolean;
begin
  select license_id into v_license from public.company_users where id = p_company_user_id;
  if v_license is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  execute format($q$select exists (select 1 from public.company_users where license_id = $1 and %I = auth.uid()
                   and role::text in ('direction', 'rh') and coalesce(is_active, true))$q$, auth_col)
    into v_ok using v_license;
  if not v_ok then raise exception 'Réservé à la Direction et aux RH de la société' using errcode = '42501'; end if;
  if (select role::text from public.company_users where id = p_company_user_id) = 'direction'
     and coalesce(public._my_role_in(v_license), '') <> 'direction' then
    raise exception 'Seule la Direction peut changer le mot de passe d''un accès Direction' using errcode = '42501';
  end if;
  return public._company_temp_password(p_company_user_id);
end;
$$;
revoke all on function public.company_reset_user_password(uuid) from public, anon;
grant execute on function public.company_reset_user_password(uuid) to authenticated;

-- Après le choix du mot de passe personnel.
create or replace function public.company_password_changed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
begin
  if auth.uid() is null then return; end if;
  perform set_config('app.admin_context', 'true', true);
  execute format('update public.company_users set must_change_password = false, password_set_at = now() where %I = $1', auth_col)
    using auth.uid();
end;
$$;
revoke all on function public.company_password_changed() from public, anon;
grant execute on function public.company_password_changed() to authenticated;

-- Identifiant personnel -> email de connexion (rien si l'identifiant n'existe pas).
create or replace function public.resolve_login(p_login text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.company_users
   where login_id is not null and lower(login_id) = lower(trim(p_login)) and coalesce(is_active, true)
   limit 1;
$$;
revoke all on function public.resolve_login(text) from public;
grant execute on function public.resolve_login(text) to anon, authenticated;

-- Sociétés de l'utilisateur connecté (rattache le compte à ses fiches par email si besoin).
create or replace function public.my_companies()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := coalesce((select config from public.central_bridge where id = 1), '{}'::jsonb);
  auth_col text := coalesce(cfg->>'user_auth_col', 'user_id');
  code_col text := coalesce(cfg->>'code_col', 'code');
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  r jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  perform set_config('app.admin_context', 'true', true);
  execute format('update public.company_users set %I = $1 where %I is null and lower(email) = $2', auth_col, auth_col)
    using auth.uid(), v_email;
  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object(
      'license_id', l.id, 'company_user_id', u.id, 'company_name', coalesce(l.company_name, l.company_identifier, l.email),
      'code', l.%2$I, 'company_identifier', l.company_identifier, 'license_email', l.email, 'email', u.email,
      'role', u.role::text, 'display_name', u.display_name, 'must_change_password', u.must_change_password,
      'license_active', l.is_active) order by l.company_name), '[]'::jsonb)
    from public.company_users u join public.licenses l on l.id = u.license_id
    where u.%1$I = $1 and coalesce(u.is_active, true)$q$, auth_col, code_col)
    into r using auth.uid();
  return r;
end;
$$;
revoke all on function public.my_companies() from public, anon;
grant execute on function public.my_companies() to authenticated;
