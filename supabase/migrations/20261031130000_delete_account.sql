-- OptiCentral : suppression définitive d'un compte utilisateur.
-- Retire l'accès à la société (company_users) ET le compte de connexion (auth.users)
-- s'il ne sert plus à rien d'autre dans ce logiciel (autre société, compte principal).
-- Si le compte de connexion ne peut pas être effacé (référencé ailleurs), il est bloqué.
create or replace function public.central_delete_account(p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := (select config from public.central_bridge where id = 1);
  cu jsonb;
  v_uid uuid;
  v_email text;
  v_auth text := 'conservé';
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  select to_jsonb(c) into cu from public.company_users c where c.id = (p_payload->>'id')::uuid;
  if cu is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  v_email := lower(cu->>'email');
  v_uid := nullif(cu->>'user_id', '')::uuid;
  if v_uid is null then
    select id into v_uid from auth.users where lower(email) = v_email order by created_at limit 1;
  end if;

  delete from public.company_users where id = (cu->>'id')::uuid;

  if v_uid is not null
     and not exists (select 1 from public.company_users c
                      where lower(c.email) = v_email or (to_jsonb(c)->>'user_id') = v_uid::text)
     and not exists (select 1 from public.licenses l where lower(l.email) = v_email) then
    begin
      delete from auth.users where id = v_uid;
      v_auth := 'supprimé';
    exception when others then
      update auth.users set banned_until = 'infinity'::timestamptz where id = v_uid;
      v_auth := 'bloqué';
    end;
  end if;

  perform public._central_log(cfg, left(coalesce(nullif(p_payload->>'_actor', ''), 'opticentral'), 120),
                              'central_delete_account', (cu->>'id')::uuid,
                              jsonb_build_object('email', v_email, 'login', v_auth));
  return jsonb_build_object('ok', true, 'email', v_email, 'login', v_auth);
end $$;
revoke all on function public.central_delete_account(text, jsonb) from public;
grant execute on function public.central_delete_account(text, jsonb) to anon, authenticated;
