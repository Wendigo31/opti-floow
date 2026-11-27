-- Alerte « Function Search Path Mutable » : chemin de recherche fixé pour toutes les
-- fonctions de public qui n'en avaient pas (comportement inchangé : public puis extensions).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) x where x like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s set search_path = public, extensions', f.sig);
  end loop;
end $$;
-- Vue clients_safe : respecte les droits de la personne connectée (alerte « Security Definer View »).
alter view public.clients_safe set (security_invoker = true);
revoke all on public.clients_safe from anon;
-- Règle inutile (le rôle serveur ignore déjà les règles) signalée comme lecture ouverte.
drop policy if exists "Service role can read login_history" on public.login_history;
