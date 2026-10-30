-- OptiCentral : action « users_all » du pont v2 — tous les accès des sociétés (qui les a créés,
-- rôle, actif ou non), pour les voir, désactiver ou supprimer depuis OptiCentral. Rejouable.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''users_all''' in d) > 0 then return; end if;
  d := replace(d, $x$  when 'autosuspend_get' then$x$, $x$  when 'users_all' then
    select coalesce(jsonb_agg(x order by x->>'company_name', x->>'email'), '[]'::jsonb) into r from (
      select jsonb_build_object(
        'id', u.id, 'license_id', u.license_id,
        'company_name', coalesce(l.company_name, l.company_identifier, l.email), 'siren', l.siren,
        'email', u.email, 'display_name', u.display_name, 'role', u.role::text,
        'is_active', coalesce(u.is_active, true), 'login_id', to_jsonb(u)->>'login_id',
        'created_via', to_jsonb(u)->>'created_via', 'created_by', to_jsonb(u)->>'created_by',
        'must_change_password', to_jsonb(u)->'must_change_password',
        'last_activity_at', to_jsonb(u)->>'last_activity_at', 'created_at', u.created_at) as x
      from public.company_users u join public.licenses l on l.id = u.license_id) s;
    return r;

  when 'autosuspend_get' then$x$);
  execute d;
end $patch$;
-- Direction et RH créent les accès de leurs salariés avec les rôles Exploitation, Comptabilité ou RH ;
-- les accès Direction sont créés par OptiGroup depuis OptiCentral. Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.company_create_user(uuid,text,text,text,text)'::regprocedure);
begin
  if position('créés par OptiGroup' in d) > 0 then return; end if;
  d := regexp_replace(d,
    'if p_role = ''direction'' and v_my_role <> ''direction'' then\s+raise exception ''Seule la Direction peut créer un accès Direction'' using errcode = ''42501'';\s+end if;',
    'if p_role = ''direction'' then raise exception ''Les accès Direction sont créés par OptiGroup. Choisissez Exploitation, Comptabilité ou RH.'' using errcode = ''42501''; end if;');
  if position('créés par OptiGroup' in d) = 0 then raise exception 'company_create_user : modèle introuvable'; end if;
  execute d;
end $patch$;
