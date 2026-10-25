-- OptiFlow : le forfait de la société (Essentiel / Pro / Entreprise) est renvoyé au logiciel.
-- Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.flow_license_payload(uuid)'::regprocedure);
begin
  if position('''planName''' in d) > 0 then return; end if;
  d := replace(d, $x$'companyName', l.company_name,$x$, $x$'companyName', l.company_name, 'planName', l.plan_type,$x$);
  if position('''planName''' in d) = 0 then raise exception 'flow_license_payload : modèle introuvable'; end if;
  execute d;
end $patch$;
