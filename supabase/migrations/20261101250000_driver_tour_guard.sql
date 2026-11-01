-- Audit : l'application conducteur ne peut plus rejouer une tournée terminée
-- (double appui ou lien rouvert) — sinon les palettes étaient comptées deux fois.
-- La ligne est verrouillée pendant la mise à jour.

-- Le conducteur démarre / termine une tournée, avec remarque et palettes échangées.
create or replace function public.driver_update_tour(p_token text, p_entry uuid, p_status text, p_note text default null,
                                                     p_pallets_given integer default 0, p_pallets_returned integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.driver_access_links; e public.planning_entries; v_note text;
begin
  if p_token is null or length(p_token) < 20 then raise exception 'Lien conducteur invalide' using errcode = '42501'; end if;
  select * into l from public.driver_access_links where token = p_token;
  if l.token is null then raise exception 'Lien conducteur invalide' using errcode = '42501'; end if;
  select * into e from public.planning_entries where id = p_entry and license_id = l.license_id
     and (driver_id = l.driver_id or relay_driver_id = l.driver_id)
   for update;
  if e.id is null then raise exception 'Tournée introuvable' using errcode = 'P0002'; end if;
  -- Une tournée terminée ou annulée ne se rejoue pas (évite les palettes comptées deux fois).
  if e.status = 'completed' then raise exception 'Cette tournée est déjà terminée.' using errcode = '22023'; end if;
  if e.status = 'cancelled' then raise exception 'Cette tournée a été annulée.' using errcode = '22023'; end if;
  if p_status not in ('in_progress', 'completed') then raise exception 'Statut invalide' using errcode = '22023'; end if;
  v_note := nullif(left(trim(coalesce(p_note, '')), 500), '');
  update public.planning_entries
     set status = p_status,
         notes = case when v_note is null then notes
                      else concat_ws(E'\n', nullif(notes, ''), format('[Conducteur %s] %s', to_char(now() at time zone 'Europe/Paris', 'DD/MM HH24:MI'), v_note)) end,
         updated_at = now()
   where id = e.id;
  if (coalesce(p_pallets_given, 0) > 0 or coalesce(p_pallets_returned, 0) > 0) and e.client_id is not null
     and to_regclass('public.pallet_movements') is not null then
    execute 'insert into public.pallet_movements (license_id, client_id, movement_date, pallet_type, given, returned, reference, source, created_by)
             values ($1, $2, $3, ''EUR'', $4, $5, $6, ''conducteur'', null)'
      using l.license_id, e.client_id::text, e.planning_date, greatest(coalesce(p_pallets_given, 0), 0),
            greatest(coalesce(p_pallets_returned, 0), 0), coalesce(e.tour_name, 'Tournée') || ' du ' || to_char(e.planning_date, 'DD/MM/YYYY');
  end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
