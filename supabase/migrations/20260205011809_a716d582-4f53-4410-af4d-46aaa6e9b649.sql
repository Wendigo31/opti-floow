
-- First, clean up orphan records with non-existent license_ids
DELETE FROM public.saved_tours WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.search_history WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.active_itinerary_sessions WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.clients WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.company_config WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.company_invitations WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.company_settings WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.company_sync_events WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.company_users WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.favorite_addresses WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.license_addons WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.license_features WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.planning_entries WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.quotes WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.trips WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.user_charges WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.user_drivers WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.user_trailers WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.user_vehicles WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.charge_presets WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.exploitation_metric_settings WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.access_requests WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;
DELETE FROM public.login_history WHERE license_id NOT IN (SELECT id FROM public.licenses) AND license_id IS NOT NULL;

-- Now add/update FK constraints with ON DELETE CASCADE

-- saved_tours
ALTER TABLE public.saved_tours DROP CONSTRAINT IF EXISTS saved_tours_license_id_fkey;
ALTER TABLE public.saved_tours 
  ADD CONSTRAINT saved_tours_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- search_history
ALTER TABLE public.search_history DROP CONSTRAINT IF EXISTS search_history_license_id_fkey;
ALTER TABLE public.search_history 
  ADD CONSTRAINT search_history_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- active_itinerary_sessions  
ALTER TABLE public.active_itinerary_sessions DROP CONSTRAINT IF EXISTS active_itinerary_sessions_license_id_fkey;
ALTER TABLE public.active_itinerary_sessions 
  ADD CONSTRAINT active_itinerary_sessions_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_license_id_fkey;
ALTER TABLE public.clients 
  ADD CONSTRAINT clients_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- company_config
ALTER TABLE public.company_config DROP CONSTRAINT IF EXISTS company_config_license_id_fkey;
ALTER TABLE public.company_config 
  ADD CONSTRAINT company_config_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- company_invitations
ALTER TABLE public.company_invitations DROP CONSTRAINT IF EXISTS company_invitations_license_id_fkey;
ALTER TABLE public.company_invitations 
  ADD CONSTRAINT company_invitations_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- company_settings
ALTER TABLE public.company_settings DROP CONSTRAINT IF EXISTS company_settings_license_id_fkey;
ALTER TABLE public.company_settings 
  ADD CONSTRAINT company_settings_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- company_sync_events
ALTER TABLE public.company_sync_events DROP CONSTRAINT IF EXISTS company_sync_events_license_id_fkey;
ALTER TABLE public.company_sync_events 
  ADD CONSTRAINT company_sync_events_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- company_users
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_license_id_fkey;
ALTER TABLE public.company_users 
  ADD CONSTRAINT company_users_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- favorite_addresses
ALTER TABLE public.favorite_addresses DROP CONSTRAINT IF EXISTS favorite_addresses_license_id_fkey;
ALTER TABLE public.favorite_addresses 
  ADD CONSTRAINT favorite_addresses_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- license_addons
ALTER TABLE public.license_addons DROP CONSTRAINT IF EXISTS license_addons_license_id_fkey;
ALTER TABLE public.license_addons 
  ADD CONSTRAINT license_addons_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- license_features
ALTER TABLE public.license_features DROP CONSTRAINT IF EXISTS license_features_license_id_fkey;
ALTER TABLE public.license_features 
  ADD CONSTRAINT license_features_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- planning_entries
ALTER TABLE public.planning_entries DROP CONSTRAINT IF EXISTS planning_entries_license_id_fkey;
ALTER TABLE public.planning_entries 
  ADD CONSTRAINT planning_entries_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- quotes
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_license_id_fkey;
ALTER TABLE public.quotes 
  ADD CONSTRAINT quotes_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- trips
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_license_id_fkey;
ALTER TABLE public.trips 
  ADD CONSTRAINT trips_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- user_charges
ALTER TABLE public.user_charges DROP CONSTRAINT IF EXISTS user_charges_license_id_fkey;
ALTER TABLE public.user_charges 
  ADD CONSTRAINT user_charges_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- user_drivers
ALTER TABLE public.user_drivers DROP CONSTRAINT IF EXISTS user_drivers_license_id_fkey;
ALTER TABLE public.user_drivers 
  ADD CONSTRAINT user_drivers_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- user_trailers
ALTER TABLE public.user_trailers DROP CONSTRAINT IF EXISTS user_trailers_license_id_fkey;
ALTER TABLE public.user_trailers 
  ADD CONSTRAINT user_trailers_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- user_vehicles
ALTER TABLE public.user_vehicles DROP CONSTRAINT IF EXISTS user_vehicles_license_id_fkey;
ALTER TABLE public.user_vehicles 
  ADD CONSTRAINT user_vehicles_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- charge_presets
ALTER TABLE public.charge_presets DROP CONSTRAINT IF EXISTS charge_presets_license_id_fkey;
ALTER TABLE public.charge_presets 
  ADD CONSTRAINT charge_presets_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- exploitation_metric_settings
ALTER TABLE public.exploitation_metric_settings DROP CONSTRAINT IF EXISTS exploitation_metric_settings_license_id_fkey;
ALTER TABLE public.exploitation_metric_settings 
  ADD CONSTRAINT exploitation_metric_settings_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- access_requests
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_license_id_fkey;
ALTER TABLE public.access_requests 
  ADD CONSTRAINT access_requests_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;

-- login_history
ALTER TABLE public.login_history DROP CONSTRAINT IF EXISTS login_history_license_id_fkey;
ALTER TABLE public.login_history 
  ADD CONSTRAINT login_history_license_id_fkey 
  FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;
