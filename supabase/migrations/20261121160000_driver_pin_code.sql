-- Appli OptiGroup Conducteur (une appli pour OptiFret, OptiFlow et OptiXpress) :
-- chaque conducteur OptiFlow reçoit en plus de son lien un code à 6 chiffres,
-- saisi dans l'appli sous la forme FL-123456. Le code ouvre le même jeton que le
-- lien ; régénérer le lien change aussi le code. Essais limités par adresse IP.

alter table public.driver_access_links add column if not exists pin_code text;

create or replace function public._driver_new_pin() returns text
language plpgsql volatile set search_path = public as $$
declare v text;
begin
  loop
    v := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.driver_access_links where pin_code = v);
  end loop;
  return v;
end $$;
revoke all on function public._driver_new_pin() from public, anon, authenticated;

create or replace function public._driver_link_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pin_code is null then new.pin_code := public._driver_new_pin(); end if;
  return new;
end $$;
drop trigger if exists driver_link_pin on public.driver_access_links;
create trigger driver_link_pin before insert on public.driver_access_links
  for each row execute function public._driver_link_pin();

update public.driver_access_links set pin_code = public._driver_new_pin() where pin_code is null;
create unique index if not exists driver_access_links_pin_key on public.driver_access_links (pin_code);

-- Code d'un conducteur, pour l'afficher au bureau (même accès que le lien).
create or replace function public.driver_access_pin(p_driver_id text)
returns text language plpgsql security definer set search_path = public as $$
declare v_license uuid := public.get_user_license_id(auth.uid()); v_pin text;
begin
  if v_license is null or coalesce(public._my_role_in(v_license), '') not in ('direction', 'exploitation', 'rh') then
    raise exception 'Réservé à la Direction, à l''Exploitation et aux RH' using errcode = '42501';
  end if;
  perform public.driver_access_link(p_driver_id, false);
  select pin_code into v_pin from public.driver_access_links where license_id = v_license and driver_id = p_driver_id;
  return v_pin;
end $$;
revoke all on function public.driver_access_pin(text) from public, anon;
grant execute on function public.driver_access_pin(text) to authenticated;

-- Essais de connexion par code (10 par quart d'heure et par adresse IP).
create table if not exists public.driver_pin_attempts (
  id bigserial primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists driver_pin_attempts_ip_at on public.driver_pin_attempts (ip, at);
alter table public.driver_pin_attempts enable row level security;

create or replace function public.driver_login_pin(p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_ip text; v_pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g'); v_token text;
begin
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'inconnue'), ',', 1);
  exception when others then v_ip := 'inconnue';
  end;
  delete from public.driver_pin_attempts where at < now() - interval '1 day';
  if (select count(*) from public.driver_pin_attempts where ip = v_ip and at > now() - interval '15 minutes') >= 10 then
    raise exception 'Trop d''essais. Réessayez dans un quart d''heure.' using errcode = '42501';
  end if;
  if length(v_pin) <> 6 then
    insert into public.driver_pin_attempts (ip) values (v_ip);
    return null;
  end if;
  select token into v_token from public.driver_access_links where pin_code = v_pin;
  if v_token is null then
    insert into public.driver_pin_attempts (ip) values (v_ip);
    return null;
  end if;
  update public.driver_access_links set last_used_at = now() where token = v_token;
  return v_token;
end $$;
revoke all on function public.driver_login_pin(text) from public;
grant execute on function public.driver_login_pin(text) to anon, authenticated;
