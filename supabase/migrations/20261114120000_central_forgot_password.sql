-- Mot de passe oublié via OptiCentral : OptiCentral appelle ce pont avec l'identifiant saisi,
-- reçoit le code provisoire et envoie lui-même l'email. Mêmes limites que forgot_password_issue
-- (3 demandes par heure et par adresse, 100 par heure au total).
create or replace function public.central_forgot_password(p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r jsonb;
  v_slug text;
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  r := public.forgot_password_issue(left(p_payload->>'login', 200));
  if r is null then
    return jsonb_build_object('found', false);
  end if;
  if coalesce((r->>'limited')::boolean, false) then
    return jsonb_build_object('found', true, 'limited', true);
  end if;
  select l.slug into v_slug
    from public.company_users c join public.licenses l on l.id = c.license_id
   where lower(c.email) = lower(r->>'email') and coalesce(c.is_active, true)
   order by c.created_at limit 1;
  return r || jsonb_build_object('found', true, 'slug', v_slug);
end $function$;

revoke all on function public.central_forgot_password(text, jsonb) from public;
grant execute on function public.central_forgot_password(text, jsonb) to anon, authenticated, service_role;
