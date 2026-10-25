-- OptiCentral : « dernière connexion » d'une société = dernier login enregistré
-- ou dernière utilisation de la licence (sessions reprises sans nouveau login).
-- Rejouable sans risque.
do $patch$
declare d text := pg_get_functiondef('public.central_admin(text,text,jsonb)'::regprocedure);
begin
  if position('l.last_used_at)) as x' in d) = 0 then
    d := replace(d, $x$'_last_login', (select max(h.%4$I) from %3$I h where h.license_id = l.id and h.success)) as x$x$,
                    $x$'_last_login', greatest((select max(h.%4$I) from %3$I h where h.license_id = l.id and h.success), l.last_used_at)) as x$x$);
    execute d;
  end if;
end $patch$;
