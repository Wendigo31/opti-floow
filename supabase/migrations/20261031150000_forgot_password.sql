-- Mot de passe oublié : un code provisoire est envoyé par email (fonction forgot-password).
-- L'utilisateur se connecte avec ce code puis choisit un nouveau mot de passe (écran forcé).
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.password_reset_requests enable row level security;
revoke all on public.password_reset_requests from anon, authenticated;
create index if not exists password_reset_requests_email_idx on public.password_reset_requests (email, created_at desc);

create or replace function public.forgot_password_issue(p_login text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_login, '')));
  v_email text;
  cu record;
  v_code text;
begin
  if v = '' then return null; end if;
  if position('@' in v) > 0 then
    v_email := v;
  else
    begin
      v_email := public.resolve_login(v);
    exception when others then
      return null;
    end;
  end if;
  if v_email is null then return null; end if;
  select c.id, c.email, c.display_name, l.company_name into cu
    from public.company_users c left join public.licenses l on l.id = c.license_id
   where lower(c.email) = v_email and coalesce(c.is_active, true)
   order by c.created_at limit 1;
  if cu.id is null then return null; end if;
  -- Anti-abus : 3 codes par adresse et par heure, 100 par heure au total.
  if (select count(*) from public.password_reset_requests where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.password_reset_requests where created_at > now() - interval '1 hour') >= 100 then
    return jsonb_build_object('limited', true);
  end if;
  insert into public.password_reset_requests (email) values (v_email);
  v_code := public._company_temp_password(cu.id);
  return jsonb_build_object('email', cu.email, 'name', cu.display_name, 'company', cu.company_name, 'code', v_code);
end $$;
revoke all on function public.forgot_password_issue(text) from public, anon, authenticated;
grant execute on function public.forgot_password_issue(text) to service_role;
