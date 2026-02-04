-- =====================================================
-- SECURITY FIX: Complete RLS policy overhaul for all sensitive tables
-- Note: saved_tours.user_id is TEXT type, need to cast auth.uid()
-- =====================================================

-- ==================== SAVED_TOURS (user_id is TEXT) ====================
DROP POLICY IF EXISTS "saved_tours_select_policy" ON public.saved_tours;
DROP POLICY IF EXISTS "saved_tours_insert_policy" ON public.saved_tours;
DROP POLICY IF EXISTS "saved_tours_update_policy" ON public.saved_tours;
DROP POLICY IF EXISTS "saved_tours_delete_policy" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can view their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can view all saved tours" ON public.saved_tours;

CREATE POLICY "saved_tours_select_own_company" ON public.saved_tours
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "saved_tours_insert_own_company" ON public.saved_tours
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "saved_tours_update_own_company" ON public.saved_tours
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "saved_tours_delete_own_company" ON public.saved_tours
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== TRIPS ====================
DROP POLICY IF EXISTS "trips_select_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_update_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON public.trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can view all trips" ON public.trips;

CREATE POLICY "trips_select_own_company" ON public.trips
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "trips_insert_own_company" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "trips_update_own_company" ON public.trips
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "trips_delete_own_company" ON public.trips
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== QUOTES ====================
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can view all quotes" ON public.quotes;

CREATE POLICY "quotes_select_own_company" ON public.quotes
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "quotes_insert_own_company" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "quotes_update_own_company" ON public.quotes
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "quotes_delete_own_company" ON public.quotes
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== USER_DRIVERS ====================
DROP POLICY IF EXISTS "user_drivers_select_policy" ON public.user_drivers;
DROP POLICY IF EXISTS "user_drivers_insert_policy" ON public.user_drivers;
DROP POLICY IF EXISTS "user_drivers_update_policy" ON public.user_drivers;
DROP POLICY IF EXISTS "user_drivers_delete_policy" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can view their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can view all drivers" ON public.user_drivers;

CREATE POLICY "user_drivers_select_own_company" ON public.user_drivers
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_drivers_insert_own_company" ON public.user_drivers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "user_drivers_update_own_company" ON public.user_drivers
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_drivers_delete_own_company" ON public.user_drivers
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== USER_CHARGES ====================
DROP POLICY IF EXISTS "user_charges_select_policy" ON public.user_charges;
DROP POLICY IF EXISTS "user_charges_insert_policy" ON public.user_charges;
DROP POLICY IF EXISTS "user_charges_update_policy" ON public.user_charges;
DROP POLICY IF EXISTS "user_charges_delete_policy" ON public.user_charges;
DROP POLICY IF EXISTS "Users can view their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Company members can view all charges" ON public.user_charges;

CREATE POLICY "user_charges_select_own_company" ON public.user_charges
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_charges_insert_own_company" ON public.user_charges
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "user_charges_update_own_company" ON public.user_charges
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_charges_delete_own_company" ON public.user_charges
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== USER_VEHICLES ====================
DROP POLICY IF EXISTS "user_vehicles_select_policy" ON public.user_vehicles;
DROP POLICY IF EXISTS "user_vehicles_insert_policy" ON public.user_vehicles;
DROP POLICY IF EXISTS "user_vehicles_update_policy" ON public.user_vehicles;
DROP POLICY IF EXISTS "user_vehicles_delete_policy" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can view all vehicles" ON public.user_vehicles;

CREATE POLICY "user_vehicles_select_own_company" ON public.user_vehicles
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_vehicles_insert_own_company" ON public.user_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "user_vehicles_update_own_company" ON public.user_vehicles
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_vehicles_delete_own_company" ON public.user_vehicles
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== USER_TRAILERS ====================
DROP POLICY IF EXISTS "user_trailers_select_policy" ON public.user_trailers;
DROP POLICY IF EXISTS "user_trailers_insert_policy" ON public.user_trailers;
DROP POLICY IF EXISTS "user_trailers_update_policy" ON public.user_trailers;
DROP POLICY IF EXISTS "user_trailers_delete_policy" ON public.user_trailers;
DROP POLICY IF EXISTS "Users can view their own trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can view all trailers" ON public.user_trailers;

CREATE POLICY "user_trailers_select_own_company" ON public.user_trailers
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_trailers_insert_own_company" ON public.user_trailers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "user_trailers_update_own_company" ON public.user_trailers
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "user_trailers_delete_own_company" ON public.user_trailers
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== CLIENTS ====================
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can delete all clients" ON public.clients;

CREATE POLICY "clients_select_own_company" ON public.clients
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "clients_insert_own_company" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "clients_update_own_company" ON public.clients
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "clients_delete_own_company" ON public.clients
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- ==================== SEARCH_HISTORY ====================
DROP POLICY IF EXISTS "search_history_select_policy" ON public.search_history;
DROP POLICY IF EXISTS "search_history_insert_policy" ON public.search_history;
DROP POLICY IF EXISTS "search_history_update_policy" ON public.search_history;
DROP POLICY IF EXISTS "search_history_delete_policy" ON public.search_history;

CREATE POLICY "search_history_select_own_company" ON public.search_history
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "search_history_insert_own_company" ON public.search_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "search_history_delete_own" ON public.search_history
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==================== ACTIVE_ITINERARY_SESSIONS ====================
DROP POLICY IF EXISTS "active_itinerary_sessions_select_policy" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "active_itinerary_sessions_insert_policy" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "active_itinerary_sessions_update_policy" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "active_itinerary_sessions_delete_policy" ON public.active_itinerary_sessions;

CREATE POLICY "active_itinerary_sessions_select_own_company" ON public.active_itinerary_sessions
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "active_itinerary_sessions_insert_own" ON public.active_itinerary_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "active_itinerary_sessions_update_own" ON public.active_itinerary_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "active_itinerary_sessions_delete_own" ON public.active_itinerary_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==================== COMPANY_SETTINGS ====================
DROP POLICY IF EXISTS "company_settings_select_policy" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_update_policy" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_delete_policy" ON public.company_settings;
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;

CREATE POLICY "company_settings_select_own_company" ON public.company_settings
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "company_settings_update_own_company" ON public.company_settings
  FOR UPDATE TO authenticated
  USING (
    license_id = public.get_user_license_id(auth.uid())
    AND public.is_company_owner(license_id, auth.uid())
  );

CREATE POLICY "company_settings_delete_direction_only" ON public.company_settings
  FOR DELETE TO authenticated
  USING (
    license_id = public.get_user_license_id(auth.uid())
    AND public.is_company_owner(license_id, auth.uid())
  );