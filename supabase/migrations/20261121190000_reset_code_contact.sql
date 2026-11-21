-- Mot de passe oublié sans blocage : la demande ne remplace plus le mot de passe.
-- Elle crée un code provisoire (30 min, 5 essais). Le mot de passe n'est changé
-- qu'au moment où la personne se connecte avec ce code (redeem_reset_code).
create table if not exists public.password_reset_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0
);
alter table public.password_reset_codes enable row level security;

create or replace function public.forgot_password_issue(p_login text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
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
  if (select count(*) from public.password_reset_requests where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.password_reset_requests where created_at > now() - interval '1 hour') >= 100 then
    return jsonb_build_object('limited', true);
  end if;
  insert into public.password_reset_requests (email) values (v_email);
  v_code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '') from generate_series(1, 10));
  insert into public.password_reset_codes (email, code_hash, expires_at, attempts)
  values (v_email, encode(extensions.digest(v_code, 'sha256'), 'hex'), now() + interval '30 minutes', 0)
  on conflict (email) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;
  delete from public.password_reset_codes where expires_at < now() - interval '1 day';
  return jsonb_build_object('email', cu.email, 'name', cu.display_name, 'company', cu.company_name, 'code', v_code);
end $function$;

create or replace function public.redeem_reset_code(p_login text, p_code text)
returns boolean language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare
  v text := lower(trim(coalesce(p_login, '')));
  v_code text := upper(trim(coalesce(p_code, '')));
  v_email text;
  r public.password_reset_codes;
  v_uid uuid;
begin
  if v = '' or v_code !~ '^[A-Z0-9]{10}$' then return false; end if;
  if position('@' in v) > 0 then v_email := v;
  else
    begin v_email := public.resolve_login(v); exception when others then return false; end;
  end if;
  if v_email is null then return false; end if;
  select * into r from public.password_reset_codes where email = v_email for update;
  if r.email is null or r.expires_at < now() then return false; end if;
  if r.attempts >= 5 then
    delete from public.password_reset_codes where email = v_email;
    return false;
  end if;
  if r.code_hash <> encode(extensions.digest(v_code, 'sha256'), 'hex') then
    update public.password_reset_codes set attempts = attempts + 1 where email = v_email;
    return false;
  end if;
  delete from public.password_reset_codes where email = v_email;
  v_uid := public._auth_set_password(v_email, v_code);
  perform set_config('app.admin_context', 'true', true);
  update public.company_users
     set user_id = v_uid, must_change_password = true, password_set_at = null,
         accepted_at = coalesce(accepted_at, now()), updated_at = now()
   where lower(email) = v_email and coalesce(is_active, true);
  return true;
end $function$;
revoke all on function public.redeem_reset_code(text, text) from public;
grant execute on function public.redeem_reset_code(text, text) to anon, authenticated;

-- Coordonnées société : seule une Direction connectée peut les compléter
-- (le chemin « code société + email » permettait de se faire passer pour elle).
create or replace function public.complete_company_contact(p_license_id uuid, p_phone text, p_email text, p_code text default null::text, p_user_email text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(regexp_replace(v_phone, '\D', '', 'g')) not between 9 and 15 then raise exception 'Numéro de téléphone invalide' using errcode = '22023'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Email invalide' using errcode = '22023'; end if;
  if coalesce(public._my_role_in(p_license_id), '') <> 'direction' then
    raise exception 'Seule la Direction de la société peut compléter ces informations' using errcode = '42501';
  end if;
  update public.licenses set company_phone = v_phone, company_email = v_email, contact_completed_at = now() where id = p_license_id;
  return public.company_access(p_license_id);
end; $function$;
revoke execute on function public.complete_company_contact(uuid, text, text, text, text) from public, anon;
grant execute on function public.complete_company_contact(uuid, text, text, text, text) to authenticated;
