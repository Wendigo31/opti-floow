-- Suppression d'une société depuis OptiCentral : les comptes de connexion de ses salariés
-- (et du compte principal) sont effacés, retrouvés par email ; bloqués s'ils ne peuvent pas l'être.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
  a1 text := $x$    execute format('select array_agg(%I) from company_users where license_id = $1 and %I is not null', auth_col, auth_col) into users using v_id;$x$;
  a2 text := $x$    if users is not null then
      begin
        execute format('delete from auth.users au where au.id = any($1) and not exists (select 1 from company_users u where u.%I = au.id)', auth_col) using users;
      exception when others then null;
      end;
    end if;$x$;
begin
  if position('central_delete_company_emails' in d) > 0 then return; end if;
  if position(a1 in d) = 0 or position(a2 in d) = 0 then raise exception 'delete_company introuvable'; end if;
  d := replace(d, a1, a1 || $x$
    -- central_delete_company_emails : emails des comptes de la société, pour effacer leurs connexions.
    v_json := (select coalesce(jsonb_agg(distinct lower(e.email)), '[]'::jsonb)
                 from (select email from company_users where license_id = v_id
                       union select email from licenses where id = v_id) e where e.email is not null);$x$);
  d := replace(d, a2, a2 || $x$
    for t in select au.id from auth.users au
              where lower(au.email) in (select jsonb_array_elements_text(v_json))
                and not exists (select 1 from company_users u where lower(u.email) = lower(au.email))
                and not exists (select 1 from licenses l where lower(l.email) = lower(au.email)) loop
      begin
        delete from auth.users where id = t.id;
      exception when others then
        update auth.users set banned_until = 'infinity'::timestamptz where id = t.id;
      end;
    end loop;$x$);
  execute d;
end $patch$;
