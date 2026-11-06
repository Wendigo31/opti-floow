-- Planning (nov. 2026) : changer le conducteur ou le véhicule d'une tournée enregistrée met
-- à jour les lignes du planning qui en viennent (à partir d'aujourd'hui). Avant, la tournée
-- était modifiée mais le planning gardait l'ancien conducteur, ou restait sans conducteur.
-- Les remplacements faits jour par jour (un autre conducteur que le titulaire) sont gardés.
create or replace function public.saved_tour_sync_planning()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_driver text := nullif(old.driver_ids[1], '');
  new_driver text := nullif(new.driver_ids[1], '');
begin
  if old_driver is distinct from new_driver then
    update public.planning_entries
       set driver_id = new_driver, updated_at = now()
     where saved_tour_id = new.id
       and planning_date >= current_date
       and (driver_id is null or driver_id = '' or driver_id is not distinct from old_driver);
  end if;
  if old.vehicle_id is distinct from new.vehicle_id then
    update public.planning_entries
       set vehicle_id = new.vehicle_id, updated_at = now()
     where saved_tour_id = new.id
       and planning_date >= current_date
       and (vehicle_id is null or vehicle_id = '' or vehicle_id is not distinct from old.vehicle_id);
  end if;
  return null;
end $$;
revoke all on function public.saved_tour_sync_planning() from public, anon, authenticated;
drop trigger if exists saved_tour_sync_planning on public.saved_tours;
create trigger saved_tour_sync_planning after update of driver_ids, vehicle_id on public.saved_tours
  for each row execute function public.saved_tour_sync_planning();
