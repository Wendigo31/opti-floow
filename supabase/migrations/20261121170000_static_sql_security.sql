-- Sécurité (alerte Lovable « functions run commands they build as the owner ») :
-- ces fonctions n'assemblent plus de requêtes à l'exécution. Les noms de colonnes
-- propres à chaque logiciel sont écrits en dur (même comportement qu'avant).

create or replace function public.company_password_changed()
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null then return; end if;
  perform set_config('app.admin_context', 'true', true);
  update public.company_users set must_change_password = false, password_set_at = now() where user_id = auth.uid();
end; $function$;

create or replace function public.my_companies()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  r jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  perform set_config('app.admin_context', 'true', true);
  update public.company_users set user_id = auth.uid() where user_id is null and lower(email) = v_email;
  select coalesce(jsonb_agg(jsonb_build_object(
      'license_id', l.id, 'company_user_id', u.id, 'company_name', coalesce(l.company_name, l.company_identifier, l.email),
      'code', l.license_code, 'company_identifier', l.company_identifier, 'license_email', l.email, 'email', u.email,
      'role', u.role::text, 'display_name', u.display_name, 'must_change_password', u.must_change_password,
      'license_active', l.is_active) order by l.company_name), '[]'::jsonb)
    into r
    from public.company_users u join public.licenses l on l.id = u.license_id
   where u.user_id = auth.uid() and coalesce(u.is_active, true);
  return r;
end; $function$;

create or replace function public.complete_company_contact(p_license_id uuid, p_phone text, p_email text, p_code text default null::text, p_user_email text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ok boolean := false;
  v_uid uuid;
begin
  if length(regexp_replace(v_phone, '\D', '', 'g')) not between 9 and 15 then raise exception 'Numéro de téléphone invalide' using errcode = '22023'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
  begin v_uid := auth.uid(); exception when others then v_uid := null; end;
  if v_uid is not null then
    select exists (select 1 from public.company_users where license_id = p_license_id and user_id = v_uid and role::text = 'direction' and coalesce(is_active, true)) into v_ok;
  end if;
  if not v_ok and p_code is not null and p_user_email is not null then
    select exists (select 1 from public.licenses l where l.id = p_license_id and l.license_code = trim(p_code) and (lower(l.email) = lower(trim(p_user_email))
          or exists (select 1 from public.company_users u where u.license_id = l.id and lower(u.email) = lower(trim(p_user_email)) and u.role::text = 'direction' and coalesce(u.is_active, true))))
      into v_ok;
  end if;
  if not v_ok then raise exception 'Seule la Direction de la société peut compléter ces informations' using errcode = '42501'; end if;
  update public.licenses set company_phone = v_phone, company_email = v_email, contact_completed_at = now() where id = p_license_id;
  return public.company_access(p_license_id);
end; $function$;

create or replace function public.support_create(p_license_id uuid, p_kind text, p_subject text, p_body text, p_page text default null::text, p_context jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_user record;
  v_id uuid;
begin
  if public._my_role_in(p_license_id) is null then
    raise exception 'Connectez-vous avec votre compte pour contacter le support' using errcode = '42501';
  end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
  select id, email, display_name into v_user from public.company_users where license_id = p_license_id and user_id = auth.uid() limit 1;
  insert into public.support_threads (license_id, company_user_id, auth_user_id, author_email, author_name, kind, subject, page, context)
  values (p_license_id, v_user.id, auth.uid(), v_user.email, coalesce(v_user.display_name, split_part(v_user.email, '@', 1)),
          case when p_kind in ('bug', 'question', 'chat') then p_kind else 'question' end,
          left(coalesce(nullif(trim(p_subject), ''), left(trim(p_body), 80)), 140), left(p_page, 300),
          coalesce(p_context, '{}'::jsonb) - 'password')
  returning id into v_id;
  insert into public.support_messages (thread_id, from_admin, author, body)
  values (v_id, false, coalesce(v_user.display_name, v_user.email), left(trim(p_body), 5000));
  return v_id;
end $function$;

create or replace function public.company_create_user(p_license_id uuid, p_email text, p_display_name text, p_role text, p_login_id text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_my_role text := public._my_role_in(p_license_id); v_email text := lower(trim(coalesce(p_email, ''))); v_login text := nullif(trim(coalesce(p_login_id, '')), ''); v_max int; v_count int; v_id uuid; v_pwd text;
begin
  if v_my_role is null or v_my_role not in ('direction', 'rh') then raise exception 'Réservé à la Direction et aux RH de la société' using errcode = '42501'; end if;
  if p_role not in ('direction', 'exploitation', 'comptabilite', 'rh') then raise exception 'Rôle inconnu' using errcode = '22023'; end if;
  if p_role = 'direction' then raise exception 'Les accès Direction sont créés par OptiGroup. Choisissez Exploitation, Comptabilité ou RH.' using errcode = '42501'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
  if v_login is not null and v_login !~ '^[A-Za-z0-9._-]{3,40}$' then raise exception 'Identifiant : 3 à 40 caractères (lettres, chiffres, point, tiret)' using errcode = '22023'; end if;
  if exists (select 1 from public.company_users where license_id = p_license_id and lower(email) = v_email) then raise exception 'Cet email a déjà un accès dans la société' using errcode = '23505'; end if;
  if v_login is not null and exists (select 1 from public.company_users where lower(login_id) = lower(v_login)) then raise exception 'Cet identifiant est déjà pris' using errcode = '23505'; end if;
  select max_users into v_max from public.licenses where id = p_license_id;
  select count(*) into v_count from public.company_users where license_id = p_license_id and coalesce(is_active, true);
  if v_max is not null and v_max > 0 and v_count >= v_max then raise exception 'Limite de % utilisateurs du forfait atteinte : contactez OptiGroup pour l''augmenter', v_max using errcode = '23514'; end if;
  perform set_config('app.admin_context', 'true', true);
  insert into public.company_users (license_id, email, display_name, role, is_active, invited_at, login_id, created_via, created_by)
  values (p_license_id, v_email, nullif(trim(coalesce(p_display_name, '')), ''),
          (jsonb_populate_record(null::public.company_users, jsonb_build_object('role', p_role))).role,
          true, now(), v_login, v_my_role, coalesce(auth.jwt()->>'email', ''))
  returning id into v_id;
  v_pwd := public._company_temp_password(v_id);
  return jsonb_build_object('id', v_id, 'password', v_pwd);
end; $function$;

create or replace function public.company_set_user_role(p_company_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public._team_guard(p_company_user_id);
  if p_role not in ('exploitation', 'comptabilite', 'rh') then
    raise exception 'Rôle possible : Exploitation, Comptabilité ou RH (le rôle Direction s''attribue avec OptiGroup)' using errcode = '22023';
  end if;
  if public._is_last_direction(p_company_user_id) then
    raise exception 'C''est la dernière Direction active de la société : son rôle ne peut pas changer' using errcode = '22023';
  end if;
  perform set_config('app.admin_context', 'true', true);
  update public.company_users
     set role = (jsonb_populate_record(null::public.company_users, jsonb_build_object('role', p_role))).role, updated_at = now()
   where id = p_company_user_id;
end; $function$;

-- driver_update_tour : insertion des palettes écrite en dur (la table existe).
-- (voir la base : même corps qu'avant, sans EXECUTE)
