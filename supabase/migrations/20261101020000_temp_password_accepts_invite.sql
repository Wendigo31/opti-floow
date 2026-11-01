-- Audit final (01/11/2026) : un compte qui reçoit un mot de passe provisoire (OptiCentral ou équipe)
-- est considéré comme accepté. Sans accepted_at, get_user_license_id() renvoyait null et
-- la personne restait bloquée sur l'écran de connexion d'OptiFret.
CREATE OR REPLACE FUNCTION public._company_temp_password(p_company_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_email text; v_code text; v_uid uuid;
begin
  select email into v_email from public.company_users where id = p_company_user_id;
  if v_email is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  v_code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '') from generate_series(1, 10));
  v_uid := public._auth_set_password(v_email, v_code);
  perform set_config('app.admin_context', 'true', true);
  execute format('update public.company_users set %I = $1, must_change_password = true, password_set_at = null, accepted_at = coalesce(accepted_at, now()), updated_at = now() where id = $2', auth_col) using v_uid, p_company_user_id;
  return v_code;
end; $function$

;
do $$ declare c text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
begin
  perform set_config('app.admin_context', 'true', true);
  execute format('update public.company_users set accepted_at = coalesce(password_set_at, updated_at, now()) where accepted_at is null and %I is not null', c);
end $$;
