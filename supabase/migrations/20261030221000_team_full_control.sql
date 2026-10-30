-- La Direction et les RH, piliers de la société, gèrent TOUS les accès : création (rôles
-- Exploitation, Comptabilité, RH), changement de rôle, mot de passe provisoire, activation,
-- suppression — y compris les accès Direction et RH. Garde-fous : on ne se désactive pas, on
-- ne se supprime pas et on ne change pas son propre rôle, et la société garde toujours au moins
-- une Direction active. Le rôle Direction s'attribue depuis OptiCentral. Rejouable sans risque.

-- Vrai si l'accès est la dernière Direction active de sa société.
create or replace function public._is_last_direction(p_company_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select u.role::text = 'direction' and coalesce(u.is_active, true)
       and not exists (select 1 from public.company_users o
                        where o.license_id = u.license_id and o.id <> u.id
                          and o.role::text = 'direction' and coalesce(o.is_active, true))
    from public.company_users u where u.id = p_company_user_id), false);
$$;
revoke all on function public._is_last_direction(uuid) from public, anon, authenticated;

-- Garde commune : appelant Direction / RH de la société, pas sur son propre accès.
create or replace function public._team_guard(p_company_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_license uuid;
  v_self boolean;
  v_my_role text;
begin
  select license_id into v_license from public.company_users where id = p_company_user_id;
  if v_license is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  v_my_role := public._my_role_in(v_license);
  if v_my_role is null or v_my_role not in ('direction', 'rh') then
    raise exception 'Réservé à la Direction et aux RH de la société' using errcode = '42501';
  end if;
  execute format('select %I = auth.uid() from public.company_users where id = $1', auth_col) into v_self using p_company_user_id;
  if coalesce(v_self, false) then raise exception 'Action impossible sur votre propre accès' using errcode = '22023'; end if;
  return v_license;
end;
$$;
revoke all on function public._team_guard(uuid) from public, anon, authenticated;

create or replace function public.company_set_user_active(p_company_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._team_guard(p_company_user_id);
  if not p_active and public._is_last_direction(p_company_user_id) then
    raise exception 'C''est la dernière Direction active de la société : elle ne peut pas être désactivée' using errcode = '22023';
  end if;
  perform set_config('app.admin_context', 'true', true);
  update public.company_users set is_active = p_active, updated_at = now() where id = p_company_user_id;
end;
$$;
revoke all on function public.company_set_user_active(uuid, boolean) from public, anon;
grant execute on function public.company_set_user_active(uuid, boolean) to authenticated;

create or replace function public.company_set_user_role(p_company_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._team_guard(p_company_user_id);
  if p_role not in ('exploitation', 'comptabilite', 'rh') then
    raise exception 'Rôle possible : Exploitation, Comptabilité ou RH (le rôle Direction s''attribue avec OptiGroup)' using errcode = '22023';
  end if;
  if public._is_last_direction(p_company_user_id) then
    raise exception 'C''est la dernière Direction active de la société : son rôle ne peut pas changer' using errcode = '22023';
  end if;
  perform set_config('app.admin_context', 'true', true);
  execute $q$update public.company_users
       set role = (jsonb_populate_record(null::public.company_users, jsonb_build_object('role', $1))).role, updated_at = now()
     where id = $2$q$ using p_role, p_company_user_id;
end;
$$;
revoke all on function public.company_set_user_role(uuid, text) from public, anon;
grant execute on function public.company_set_user_role(uuid, text) to authenticated;

create or replace function public.company_reset_user_password(p_company_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._team_guard(p_company_user_id);
  return public._company_temp_password(p_company_user_id);
end;
$$;
revoke all on function public.company_reset_user_password(uuid) from public, anon;
grant execute on function public.company_reset_user_password(uuid) to authenticated;

-- Supprime l'accès d'un salarié (son compte de connexion n'ouvre plus cette société).
create or replace function public.company_delete_user(p_company_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._team_guard(p_company_user_id);
  if public._is_last_direction(p_company_user_id) then
    raise exception 'C''est la dernière Direction active de la société : elle ne peut pas être supprimée' using errcode = '22023';
  end if;
  perform set_config('app.admin_context', 'true', true);
  delete from public.company_users where id = p_company_user_id;
end;
$$;
revoke all on function public.company_delete_user(uuid) from public, anon;
grant execute on function public.company_delete_user(uuid) to authenticated;
