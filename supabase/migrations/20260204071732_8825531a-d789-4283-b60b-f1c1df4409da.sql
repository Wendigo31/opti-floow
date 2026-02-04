-- =====================================================
-- FIX: Update RLS policies to allow access to both personal and company data
-- This fixes the issue where users can't see their own saved tours
-- =====================================================

-- SAVED_TOURS: Allow access to own tours OR company tours
DROP POLICY IF EXISTS "saved_tours_select_own_company" ON public.saved_tours;

CREATE POLICY "saved_tours_select_own_or_company" ON public.saved_tours
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- TRIPS: Allow access to own trips OR company trips
DROP POLICY IF EXISTS "trips_select_own_company" ON public.trips;

CREATE POLICY "trips_select_own_or_company" ON public.trips
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- QUOTES: Allow access to own quotes OR company quotes
DROP POLICY IF EXISTS "quotes_select_own_company" ON public.quotes;

CREATE POLICY "quotes_select_own_or_company" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- CLIENTS: Allow access to own clients OR company clients
DROP POLICY IF EXISTS "clients_select_own_company" ON public.clients;

CREATE POLICY "clients_select_own_or_company" ON public.clients
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- USER_VEHICLES: Allow access to own vehicles OR company vehicles
DROP POLICY IF EXISTS "user_vehicles_select_own_company" ON public.user_vehicles;

CREATE POLICY "user_vehicles_select_own_or_company" ON public.user_vehicles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- USER_TRAILERS: Allow access to own trailers OR company trailers
DROP POLICY IF EXISTS "user_trailers_select_own_company" ON public.user_trailers;

CREATE POLICY "user_trailers_select_own_or_company" ON public.user_trailers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- USER_DRIVERS: Allow access to own drivers OR company drivers
DROP POLICY IF EXISTS "user_drivers_select_own_company" ON public.user_drivers;

CREATE POLICY "user_drivers_select_own_or_company" ON public.user_drivers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- USER_CHARGES: Allow access to own charges OR company charges
DROP POLICY IF EXISTS "user_charges_select_own_company" ON public.user_charges;

CREATE POLICY "user_charges_select_own_or_company" ON public.user_charges
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );

-- SEARCH_HISTORY: Allow access to own history OR company history
DROP POLICY IF EXISTS "search_history_select_own_company" ON public.search_history;

CREATE POLICY "search_history_select_own_or_company" ON public.search_history
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR license_id = public.get_user_license_id(auth.uid())
  );