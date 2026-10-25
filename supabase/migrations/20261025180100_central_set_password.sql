-- OptiCentral : action set_password du pont v2 (mot de passe provisoire). Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''set_password''' in d) > 0 then return; end if;
  d := replace(d, $x$  when 'autosuspend_get' then$x$, $x$  when 'set_password' then
    v_id := (p->>'company_user_id')::uuid;
    v_code := public._company_temp_password(v_id);
    perform _central_log(cfg, actor, 'central_set_password', v_id, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'password', v_code);

  when 'autosuspend_get' then$x$);
  execute d;
end $patch$;
