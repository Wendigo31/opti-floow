-- Fiche société commune, contact société obligatoire et onglets par société
-- (identique dans OptiFlow, OptiFret et OptiXpress — rejouable sans risque)
--
-- 1. La fiche société a les mêmes champs dans les trois logiciels (OptiCentral
--    les remplit à l'identique depuis l'annuaire SIRENE).
-- 2. Téléphone et email de la société : vides à la création, saisis par la
--    Direction à sa première connexion. Tant qu'ils manquent, l'application
--    est bloquée pour toute la société.
-- 3. hidden_pages : onglets désactivés par l'administrateur depuis
--    OptiCentral pour cette société ; ils disparaissent de l'application.

alter table public.licenses add column if not exists siret text;
alter table public.licenses add column if not exists vat_number text;
alter table public.licenses add column if not exists naf_code text;
alter table public.licenses add column if not exists naf_label text;
alter table public.licenses add column if not exists legal_form text;
alter table public.licenses add column if not exists manager_name text;
alter table public.licenses add column if not exists company_phone text;
alter table public.licenses add column if not exists company_email text;
alter table public.licenses add column if not exists contact_completed_at timestamptz;
alter table public.licenses add column if not exists hidden_pages text[] not null default '{}'::text[];

-- Ce que l'application a besoin de savoir pour s'afficher : onglets masqués et
-- fiche contact complète ou non. Rien d'autre (ni téléphone ni email renvoyés).
create or replace function public.company_access(p_license_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
      'hidden_pages', to_jsonb(coalesce(l.hidden_pages, '{}'::text[])),
      'contact_complete', coalesce(nullif(trim(l.company_phone), ''), '') <> '' and coalesce(nullif(trim(l.company_email), ''), '') <> '',
      'company_name', l.company_name)
    from public.licenses l where l.id = p_license_id),
    jsonb_build_object('hidden_pages', '[]'::jsonb, 'contact_complete', true));
$$;
revoke all on function public.company_access(uuid) from public;
grant execute on function public.company_access(uuid) to anon, authenticated;

-- La Direction enregistre le téléphone et l'email de la société.
-- Autorisé si l'appelant est un compte Direction de cette société (session),
-- ou s'il fournit le code de licence et l'email d'un compte Direction / du titulaire.
create or replace function public.complete_company_contact(
  p_license_id uuid,
  p_phone text,
  p_email text,
  p_code text default null,
  p_user_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := coalesce((select config from public.central_bridge where id = 1), '{}'::jsonb);
  code_col text := coalesce(cfg->>'code_col', 'code');
  auth_col text := coalesce(cfg->>'user_auth_col', 'user_id');
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ok boolean := false;
  v_uid uuid;
begin
  if length(regexp_replace(v_phone, '\D', '', 'g')) not between 9 and 15 then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Email invalide' using errcode = '22023';
  end if;
  begin
    v_uid := auth.uid();
  exception when others then
    v_uid := null;
  end;
  if v_uid is not null then
    execute format('select exists (select 1 from company_users where license_id = $1 and %I = $2 and role::text = ''direction'' and coalesce(is_active, true))', auth_col)
      into v_ok using p_license_id, v_uid;
  end if;
  if not v_ok and p_code is not null and p_user_email is not null then
    execute format($q$select exists (
        select 1 from licenses l where l.id = $1 and l.%I = $2 and (
          lower(l.email) = lower($3)
          or exists (select 1 from company_users u where u.license_id = l.id and lower(u.email) = lower($3)
                     and u.role::text = 'direction' and coalesce(u.is_active, true))))$q$, code_col)
      into v_ok using p_license_id, trim(p_code), trim(p_user_email);
  end if;
  if not v_ok then
    raise exception 'Seule la Direction de la société peut compléter ces informations' using errcode = '42501';
  end if;
  update public.licenses
     set company_phone = v_phone, company_email = v_email, contact_completed_at = now()
   where id = p_license_id;
  return public.company_access(p_license_id);
end;
$$;
revoke all on function public.complete_company_contact(uuid, text, text, text, text) from public;
grant execute on function public.complete_company_contact(uuid, text, text, text, text) to anon, authenticated;
