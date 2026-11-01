-- Connexion depuis opti-group.fr par adresse e-mail : le site demande à chaque
-- logiciel dans quelle(s) société(s) cette adresse a un accès actif, puis envoie
-- la personne sur la page de connexion de sa société (ou lui laisse le choix).
-- Ne renvoie que le nom et l'identifiant de la société (déjà publics via
-- resolve_company_link). Limité à 10 recherches par adresse sur 10 minutes et
-- 300 par minute au total, pour empêcher de tester des listes d'adresses.
create table if not exists public.login_lookup_attempts (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists login_lookup_attempts_key_at on public.login_lookup_attempts (key, at desc);
alter table public.login_lookup_attempts enable row level security;
revoke all on public.login_lookup_attempts from anon, authenticated;

create or replace function public.resolve_login_by_email(p_email text)
returns table(name text, slug text)
language plpgsql volatile security definer set search_path = public as $$
declare v text := lower(trim(coalesce(p_email, '')));
begin
  if length(v) < 3 or length(v) > 254 then return; end if;
  if (select count(*) from public.login_lookup_attempts where at > now() - interval '1 minute') >= 300
     or (select count(*) from public.login_lookup_attempts where key = v and at > now() - interval '10 minutes') >= 10 then
    raise exception 'Trop de recherches, réessayez dans quelques minutes' using errcode = '54000';
  end if;
  insert into public.login_lookup_attempts (key) values (v);
  delete from public.login_lookup_attempts where at < now() - interval '1 day';
  return query
    select distinct coalesce(nullif(l.company_name, ''), l.slug)::text, l.slug::text
      from public.licenses l
     where l.is_active and l.slug is not null
       and (exists (select 1 from public.company_users cu
                     where cu.license_id = l.id and cu.is_active
                       and (lower(cu.email) = v or lower(coalesce(cu.login_id, '')) = v))
            or lower(coalesce(l.email, '')) = v)
     order by 1
     limit 10;
end $$;
revoke all on function public.resolve_login_by_email(text) from public;
grant execute on function public.resolve_login_by_email(text) to anon, authenticated;
