-- Session support : OptiCentral ouvre la vraie session d'un utilisateur pour reproduire un bug.
-- 1. central_support_session (appelée par OptiCentral avec le secret du pont) crée un jeton
--    à usage unique, valable 3 minutes, pour un utilisateur de company_users.
-- 2. support_session_claim (réservée au serveur, fonction support-session) consomme le jeton
--    et renvoie l'email du compte ; la fonction génère alors le lien de connexion.
-- Les jetons ne sont jamais stockés en clair (empreinte SHA-256).

create table if not exists public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  company_user_id uuid,
  license_id uuid,
  auth_user_id uuid not null,
  email text not null,
  admin_email text,
  reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz
);
alter table public.support_sessions enable row level security;
revoke all on public.support_sessions from anon, authenticated;
create index if not exists support_sessions_created_idx on public.support_sessions (created_at desc);

create or replace function public.central_support_session(p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cu jsonb;
  v_uid uuid;
  v_email text;
  v_token text;
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  select to_jsonb(c) into cu from public.company_users c where c.id = (p_payload->>'user_id')::uuid;
  if cu is null then
    raise exception 'Utilisateur introuvable' using errcode = 'P0002';
  end if;
  if coalesce((cu->>'is_active')::boolean, true) = false then
    raise exception 'Cet accès est désactivé : réactivez-le avant d''ouvrir sa session' using errcode = '22023';
  end if;

  v_uid := nullif(cu->>'user_id', '')::uuid;
  if v_uid is null or not exists (select 1 from auth.users where id = v_uid) then
    select id into v_uid from auth.users where lower(email) = lower(cu->>'email') order by created_at limit 1;
  end if;
  if v_uid is null then
    raise exception 'Cet utilisateur n''a pas encore de compte (invitation non acceptée)' using errcode = 'P0002';
  end if;
  select email into v_email from auth.users where id = v_uid;
  if coalesce(v_email, '') = '' then
    raise exception 'Compte sans adresse email : session impossible' using errcode = '22023';
  end if;

  -- Anti-abus : 20 sessions par heure au maximum.
  if (select count(*) from public.support_sessions where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Trop de sessions ouvertes en une heure' using errcode = '54000';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.support_sessions (token_hash, company_user_id, license_id, auth_user_id, email, admin_email, reason, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), (cu->>'id')::uuid, nullif(cu->>'license_id', '')::uuid,
          v_uid, v_email, left(p_payload->>'admin_email', 200), left(p_payload->>'reason', 500), now() + interval '3 minutes');

  return jsonb_build_object('token', v_token, 'email', v_email, 'expires_in', 180);
end $$;
revoke all on function public.central_support_session(text, jsonb) from public;
grant execute on function public.central_support_session(text, jsonb) to anon, authenticated;

create or replace function public.support_session_claim(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare s public.support_sessions;
begin
  update public.support_sessions
     set claimed_at = now()
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and claimed_at is null
     and expires_at > now()
  returning * into s;
  if s.id is null then return null; end if;
  return jsonb_build_object('email', s.email, 'auth_user_id', s.auth_user_id, 'admin_email', s.admin_email,
                            'license_id', s.license_id);
end $$;
revoke all on function public.support_session_claim(text) from public, anon, authenticated;
grant execute on function public.support_session_claim(text) to service_role;
