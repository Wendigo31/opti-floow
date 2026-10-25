-- OptiCentral : l'action « usage » renvoie aussi les fonctionnalités activées et le prix
-- actuel de chaque licence (page Tarifs). Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''price_now''' in d) > 0 then return; end if;
  d := replace(d, $x$          'drivers', %2$s,
          'vehicles', %3$s) as x$x$, $x$          'drivers', %2$s,
          'vehicles', %3$s,
          'price_now', jsonb_build_object('base', to_jsonb(l)->'base_monthly_price', 'addons', to_jsonb(l)->'addons_monthly_total',
                                          'period', to_jsonb(l)->'billing_period'),
          'features', %5$s) as x$x$);
  d := replace(d, $x$      cfg->>'plan_col') into r;$x$, $x$      cfg->>'plan_col',
      case when cfg->>'features_mode' = 'rows' then
        '(select coalesce(jsonb_agg(f.feature_code), ''[]''::jsonb) from public.license_features f where f.license_id = l.id and f.is_enabled)'
      else
        format('coalesce((select to_jsonb(f) from public.license_features f where f.license_id = l.id limit 1), %L::jsonb -> (to_jsonb(l)->>%L) -> ''features'')',
               coalesce(cfg->'plans', '{}'::jsonb)::text, cfg->>'plan_col')
      end) into r;$x$);
  if position('''price_now''' in d) = 0 then raise exception 'usage : modèle introuvable'; end if;
  execute d;
end $patch$;
