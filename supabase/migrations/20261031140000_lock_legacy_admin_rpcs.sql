-- Sécurité (audit du 31/10/2026) : ces fonctions servaient à l'ancienne page /admin, supprimée
-- (OptiCentral la remplace). Elles étaient appelables sans être connecté. Réservées au serveur.
revoke execute on function public.admin_add_company_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.admin_remove_company_user(uuid) from public, anon, authenticated;
revoke execute on function public.admin_toggle_company_user_active(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.admin_update_company_user_role(uuid, text) from public, anon, authenticated;
revoke execute on function public.link_user_to_company(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_table_columns(text) from public, anon, authenticated;
revoke execute on function public.update_user_activity(uuid) from public, anon, authenticated;
revoke execute on function public.cleanup_old_rate_limits() from public, anon, authenticated;
grant execute on function public.link_user_to_company(uuid, uuid) to service_role;
grant execute on function public.get_table_columns(text) to service_role;
grant execute on function public.cleanup_old_rate_limits() to service_role;
