-- OptiCentral : action « plans_set » du pont v2 — les 3 forfaits (Essentiel, Pro, Entreprise)
-- définis dans OptiCentral (fonctionnalités, onglets bloqués, limites, prix) servent aux
-- nouvelles licences. Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''plans_set''' in d) > 0 then return; end if;
  d := replace(d, $x$  when 'autosuspend_get' then$x$, $x$  when 'plans_set' then
    if jsonb_typeof(p->'plans') <> 'object' or not (p->'plans' ? coalesce(p->>'default_plan', cfg->>'default_plan')) then
      raise exception 'Forfaits invalides' using errcode = '22023';
    end if;
    update public.central_bridge
       set config = config || jsonb_build_object('plans', p->'plans', 'default_plan', coalesce(p->>'default_plan', config->>'default_plan'))
     where id = 1;
    perform _central_log(cfg, actor, 'central_plans_set', null, jsonb_build_object('plans', (select jsonb_agg(k) from jsonb_object_keys(p->'plans') k)));
    return jsonb_build_object('ok', true);

  when 'autosuspend_get' then$x$);
  execute d;
end $patch$;
