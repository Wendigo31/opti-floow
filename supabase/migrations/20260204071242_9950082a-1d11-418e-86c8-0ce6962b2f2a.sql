-- =====================================================
-- SECURITY CLEANUP: Remove duplicate policies and strengthen INSERT policies
-- =====================================================

-- ==================== CLIENTS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete company clients" ON public.clients;

-- ==================== SAVED_TOURS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can create saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can insert saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can update saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can delete saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can create saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can view company saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can update company saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can delete own saved tours" ON public.saved_tours;

-- ==================== TRIPS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can update trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view company trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update company trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete company trips" ON public.trips;

-- ==================== QUOTES - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view company quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update company quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete company quotes" ON public.quotes;

-- ==================== ACTIVE_ITINERARY_SESSIONS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view all sessions" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "Users can insert their session" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "Users can update their session" ON public.active_itinerary_sessions;
DROP POLICY IF EXISTS "Users can delete their session" ON public.active_itinerary_sessions;

-- ==================== SEARCH_HISTORY - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can insert search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can update their search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can delete their search history" ON public.search_history;

-- ==================== COMPANY_SETTINGS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Users can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can create their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users and admins can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users and admins can delete company settings" ON public.company_settings;

-- ==================== COMPANY_INVITATIONS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company admins can view all invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Direction and responsable can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Direction and responsable can delete invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.company_invitations;

-- ==================== COMPANY_USERS - Remove old duplicates ====================
DROP POLICY IF EXISTS "Company members can view all members" ON public.company_users;
DROP POLICY IF EXISTS "Users can view their own record" ON public.company_users;

-- ==================== USER_VEHICLES ====================
DROP POLICY IF EXISTS "Company members can view vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can insert vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can update vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can delete vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.user_vehicles;

-- ==================== USER_TRAILERS ====================
DROP POLICY IF EXISTS "Company members can view trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can insert trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can update trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can delete trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Users can view their own trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Users can insert their own trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Users can update their own trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Users can delete their own trailers" ON public.user_trailers;

-- ==================== USER_DRIVERS ====================
DROP POLICY IF EXISTS "Company members can view drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can insert drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can update drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can delete drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can view their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can insert their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can update their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can delete their own drivers" ON public.user_drivers;

-- ==================== USER_CHARGES ====================
DROP POLICY IF EXISTS "Company members can view charges" ON public.user_charges;
DROP POLICY IF EXISTS "Company members can insert charges" ON public.user_charges;
DROP POLICY IF EXISTS "Company members can update charges" ON public.user_charges;
DROP POLICY IF EXISTS "Company members can delete charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can view their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can insert their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can update their own charges" ON public.user_charges;
DROP POLICY IF EXISTS "Users can delete their own charges" ON public.user_charges;

-- ==================== LICENSES - Update to be more restrictive ====================
DROP POLICY IF EXISTS "Authenticated users can view own license only" ON public.licenses;

-- ==================== CLIENT_ADDRESSES - Add license-based policy ====================
DROP POLICY IF EXISTS "Users can view addresses of their clients" ON public.client_addresses;
DROP POLICY IF EXISTS "Users can create addresses for their clients" ON public.client_addresses;
DROP POLICY IF EXISTS "Users can update addresses of their clients" ON public.client_addresses;
DROP POLICY IF EXISTS "Users can delete addresses of their clients" ON public.client_addresses;

CREATE POLICY "client_addresses_select_own_company" ON public.client_addresses
  FOR SELECT TO authenticated
  USING (client_id IN (
    SELECT id FROM clients WHERE license_id = public.get_user_license_id(auth.uid())
  ));

CREATE POLICY "client_addresses_insert_own_company" ON public.client_addresses
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (
    SELECT id FROM clients WHERE license_id = public.get_user_license_id(auth.uid())
  ));

CREATE POLICY "client_addresses_update_own_company" ON public.client_addresses
  FOR UPDATE TO authenticated
  USING (client_id IN (
    SELECT id FROM clients WHERE license_id = public.get_user_license_id(auth.uid())
  ));

CREATE POLICY "client_addresses_delete_own_company" ON public.client_addresses
  FOR DELETE TO authenticated
  USING (client_id IN (
    SELECT id FROM clients WHERE license_id = public.get_user_license_id(auth.uid())
  ));