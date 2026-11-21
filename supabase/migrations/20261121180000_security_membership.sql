-- Sécurité (analyse Lovable du 21/11/2026) : les réglages d'accès d'une société
-- (forfait, onglets masqués) et ses bandeaux OptiCentral ne sont plus lisibles
-- que par ses membres ; _my_role_in n'assemble plus sa requête à l'exécution.

create or replace function public._my_role_in(p_license_id uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare v_role text;
begin
  if auth.uid() is null then return null; end if;
  select role::text into v_role from public.company_users where license_id = p_license_id and user_id = auth.uid() and coalesce(is_active, true) limit 1;
  return v_role;
end; $function$;

create or replace function public.company_access(p_license_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  with cfg as (select public._plan_cfg() c),
  lic as (
    select l.*, to_jsonb(l) ->> coalesce((select c->>'plan_col' from cfg), 'plan') as plan_key
    from public.licenses l where l.id = p_license_id and public._my_role_in(l.id) is not null)
  select coalesce((
    select jsonb_build_object(
      'hidden_pages', to_jsonb(coalesce(lic.hidden_pages, '{}'::text[])),
      'plan', lic.plan_key,
      'contact_complete', coalesce(nullif(trim(lic.company_phone), ''), '') <> '' and coalesce(nullif(trim(lic.company_email), ''), '') <> '',
      'company_name', lic.company_name)
    from lic),
    jsonb_build_object('hidden_pages', '[]'::jsonb, 'contact_complete', true));
$function$;

create or replace function public.active_announcements(p_license_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'message', a.message, 'level', a.level, 'ends_at', a.ends_at)
           order by a.starts_at desc), '[]'::jsonb)
  from public.central_announcements a
  where (a.license_id is null or (a.license_id = p_license_id and public._my_role_in(p_license_id) is not null))
    and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now());
$function$;

-- Code conducteur FL- : plafond global de 200 essais par quart d'heure en plus de 10 par IP
-- (corps complet appliqué en base, voir driver_login_pin).
