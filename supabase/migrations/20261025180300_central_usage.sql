-- OptiCentral : action « usage » (suivi du forfait) et contrat des conducteurs. Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''usage''' in d) = 0 then
    d := replace(d, $x$  when 'autosuspend_get' then$x$, $x$  when 'usage' then
    -- Utilisation de chaque licence face à son forfait : accès créés (et par qui), conducteurs, véhicules,
    -- copies conformes de la licence de transport.
    execute format($q$
      select coalesce(jsonb_agg(x order by x->>'company_name'), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', l.id, 'code', l.%1$I, 'company_name', coalesce(l.company_name, l.company_identifier, l.email), 'siren', l.siren,
          'is_active', l.is_active, 'plan', to_jsonb(l)->>%4$L,
          'max_users', l.max_users, 'max_drivers', to_jsonb(l)->'max_drivers', 'max_vehicles', to_jsonb(l)->'max_vehicles',
          'licence_copies', l.licence_copies, 'licence_copies_updated_at', l.licence_copies_updated_at,
          'users', (select count(*) from company_users u where u.license_id = l.id and coalesce(u.is_active, true)),
          'users_total', (select count(*) from company_users u where u.license_id = l.id),
          'users_by_direction', (select count(*) from company_users u where u.license_id = l.id and u.created_via = 'direction'),
          'users_by_rh', (select count(*) from company_users u where u.license_id = l.id and u.created_via = 'rh'),
          'users_30d', (select count(*) from company_users u where u.license_id = l.id and u.created_at > now() - interval '30 days'),
          'drivers', %2$s,
          'vehicles', %3$s) as x
        from licenses l) s$q$, code_col,
      (select case when to_regclass('public.' || tbl_) is null then 'null'
              else format('(select count(*) from public.%I x where x.license_id = l.id)', tbl_) end
         from (select case mode when 'fret' then 'drivers' else 'user_drivers' end as tbl_) z),
      (select case when to_regclass('public.' || tbl_) is null then 'null'
              else format('(select count(*) from public.%I x where x.license_id = l.id)', tbl_) end
         from (select case mode when 'fret' then 'vehicles' else 'user_vehicles' end as tbl_) z),
      cfg->>'plan_col') into r;
    return r;

  when 'autosuspend_get' then$x$);
  end if;
  if position('''contract''' in d) = 0 then
    d := replace(d, $x$'position', d.driver_data->'location', 'status',$x$, $x$'position', d.driver_data->'location', 'contract', d.driver_type, 'status',$x$);
    d := replace(d, $x$'code', d.pin_code, 'code_active', d.status = 'active', 'status', d.status,$x$, $x$'code', d.pin_code, 'code_active', d.status = 'active', 'status', d.status, 'contract', d.contract_type,$x$);
    d := replace(d, $x$'status', d.driver_type, 'code', null,$x$, $x$'status', d.driver_type, 'contract', d.driver_type, 'code', null,$x$);
  end if;
  execute d;
end $patch$;
