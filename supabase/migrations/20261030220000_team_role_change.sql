-- Direction et RH : changer le rôle d'un collègue (Exploitation, Comptabilité ou RH). Les accès
-- Direction restent gérés par OptiGroup ; personne ne change son propre rôle. Rejouable sans risque.
create or replace function public.company_set_user_role(p_company_user_id uuid, p_role text)
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
  if p_role not in ('exploitation', 'comptabilite', 'rh') then
    raise exception 'Rôle possible : Exploitation, Comptabilité ou RH (un accès Direction se demande à OptiGroup)' using errcode = '22023';
  end if;
  if v_role = 'direction' then
    raise exception 'Le rôle d''un accès Direction se change avec OptiGroup' using errcode = '42501';
  end if;
  execute format('select %I = auth.uid() from public.company_users where id = $1', auth_col) into v_self using p_company_user_id;
  if coalesce(v_self, false) then raise exception 'Vous ne pouvez pas changer votre propre rôle' using errcode = '22023'; end if;
  perform set_config('app.admin_context', 'true', true);
  execute $q$update public.company_users
       set role = (jsonb_populate_record(null::public.company_users, jsonb_build_object('role', $1))).role, updated_at = now()
     where id = $2$q$ using p_role, p_company_user_id;
end;
$$;
revoke all on function public.company_set_user_role(uuid, text) from public, anon;
grant execute on function public.company_set_user_role(uuid, text) to authenticated;

-- Équipe : renvoie aussi l'identifiant de la personne connectée (pour ne pas lui proposer de
-- changer son propre rôle).
do $patch$
declare d text := pg_get_functiondef('public.company_team(uuid)'::regprocedure);
begin
  if position('my_user_id' in d) > 0 then return; end if;
  d := replace(d, $x$'my_role', public._my_role_in(p_license_id));$x$,
    $x$'my_role', public._my_role_in(p_license_id),
    'my_user_id', (select x->>'id' from jsonb_array_elements(r) x
                   where lower(x->>'email') = lower(coalesce(auth.jwt()->>'email', '')) limit 1));$x$);
  if position('my_user_id' in d) = 0 then raise exception 'company_team : modèle introuvable'; end if;
  execute d;
end $patch$;
