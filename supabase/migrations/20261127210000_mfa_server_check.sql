-- Double authentification imposée côté serveur (27/11/2026).
-- Un compte qui a activé la double authentification (facteur TOTP vérifié) ne peut
-- lire ni écrire aucune donnée tant que sa session n'a pas été confirmée par le code
-- (niveau aal2). Le contrôle est fait par PostgREST avant CHAQUE requête (tables et
-- fonctions rpc), donc il couvre aussi les fonctions SECURITY DEFINER.
-- Sans double authentification activée : aucun changement. Visiteurs (anon) et
-- fonctions serveur (service_role) : aucun changement.
create or replace function public.mfa_pre_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     and exists (
       select 1 from auth.mfa_factors f
       where f.user_id = auth.uid() and f.status = 'verified'
     ) then
    raise exception 'Double authentification requise : saisissez le code de votre appli'
      using errcode = '42501', hint = 'mfa_required';
  end if;
end;
$$;

revoke all on function public.mfa_pre_request() from public;
grant execute on function public.mfa_pre_request() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request to 'public.mfa_pre_request';
notify pgrst, 'reload config';
