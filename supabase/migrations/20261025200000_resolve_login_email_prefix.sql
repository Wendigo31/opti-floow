-- Identifiant de connexion = partie de l'email avant le @ (ou identifiant personnel
-- s'il a été défini). Rejouable sans risque.
create or replace function public.resolve_login(p_login text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_login, '')));
  emails text[];
begin
  if v = '' then return null; end if;
  select array_agg(distinct lower(email)) into emails from public.company_users
   where coalesce(is_active, true)
     and ((login_id is not null and lower(login_id) = v) or lower(split_part(email, '@', 1)) = v);
  if emails is null then return null; end if;
  if array_length(emails, 1) > 1 then
    raise exception 'Plusieurs comptes ont cet identifiant : connectez-vous avec votre email complet' using errcode = '22023';
  end if;
  return emails[1];
end;
$$;
revoke all on function public.resolve_login(text) from public;
grant execute on function public.resolve_login(text) to anon, authenticated;
