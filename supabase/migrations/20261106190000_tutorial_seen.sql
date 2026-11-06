-- Tutoriel « déjà vu » enregistré par personne (et plus seulement dans le navigateur) :
-- il ne réapparaît plus à chaque session, ni sur un autre appareil.
alter table public.opti_member_preferences add column if not exists tutorial_seen text;

create or replace function public.opti_set_member_preferences(p_prefs jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from public._opti_me();
  if me.license_id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  insert into public.opti_member_preferences (license_id, member_id, notify_team_changes, tutorial_seen, updated_at)
  values (me.license_id, me.member_id, coalesce((p_prefs->>'notify_team_changes')::boolean, true),
          left(nullif(p_prefs->>'tutorial_seen', ''), 20), now())
  on conflict (license_id, member_id) do update
     set notify_team_changes = coalesce((p_prefs->>'notify_team_changes')::boolean, opti_member_preferences.notify_team_changes),
         tutorial_seen = coalesce(left(nullif(p_prefs->>'tutorial_seen', ''), 20), opti_member_preferences.tutorial_seen),
         updated_at = now();
  return public.opti_get_settings()->'member';
end $$;
revoke all on function public.opti_set_member_preferences(jsonb) from public, anon;
grant execute on function public.opti_set_member_preferences(jsonb) to authenticated;
