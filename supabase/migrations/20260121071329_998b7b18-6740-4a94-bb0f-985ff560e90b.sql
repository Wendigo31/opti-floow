-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions
-- instead of direct subqueries on company_users

-- Drop the problematic saved_tours policies
DROP POLICY IF EXISTS "Company members can view saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can insert saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can update saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Company members can delete saved tours" ON public.saved_tours;

-- Recreate saved_tours policies (user_id is TEXT in saved_tours)
CREATE POLICY "Company members can view saved tours" ON public.saved_tours
FOR SELECT USING (
  user_id = (auth.uid())::text 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can insert saved tours" ON public.saved_tours
FOR INSERT WITH CHECK (
  user_id = (auth.uid())::text
);

CREATE POLICY "Company members can update saved tours" ON public.saved_tours
FOR UPDATE USING (
  user_id = (auth.uid())::text 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can delete saved tours" ON public.saved_tours
FOR DELETE USING (
  user_id = (auth.uid())::text 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix trips policies (user_id is UUID in trips)
DROP POLICY IF EXISTS "Company members can view trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can update trips" ON public.trips;
DROP POLICY IF EXISTS "Company members can delete trips" ON public.trips;

CREATE POLICY "Company members can view trips" ON public.trips
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can insert trips" ON public.trips
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Company members can update trips" ON public.trips
FOR UPDATE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can delete trips" ON public.trips
FOR DELETE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix clients policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can delete clients" ON public.clients;

CREATE POLICY "Company members can view clients" ON public.clients
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can insert clients" ON public.clients
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Company members can update clients" ON public.clients
FOR UPDATE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can delete clients" ON public.clients
FOR DELETE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix quotes policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Company members can delete quotes" ON public.quotes;

CREATE POLICY "Company members can view quotes" ON public.quotes
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can insert quotes" ON public.quotes
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Company members can update quotes" ON public.quotes
FOR UPDATE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can delete quotes" ON public.quotes
FOR DELETE USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix user_vehicles policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view vehicles" ON public.user_vehicles;
DROP POLICY IF EXISTS "Company members can manage vehicles" ON public.user_vehicles;

CREATE POLICY "Company members can view vehicles" ON public.user_vehicles
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can manage vehicles" ON public.user_vehicles
FOR ALL USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix user_drivers policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Company members can manage drivers" ON public.user_drivers;

CREATE POLICY "Company members can view drivers" ON public.user_drivers
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can manage drivers" ON public.user_drivers
FOR ALL USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix user_charges policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view charges" ON public.user_charges;
DROP POLICY IF EXISTS "Company members can manage charges" ON public.user_charges;

CREATE POLICY "Company members can view charges" ON public.user_charges
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can manage charges" ON public.user_charges
FOR ALL USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

-- Fix user_trailers policies (user_id is UUID)
DROP POLICY IF EXISTS "Company members can view trailers" ON public.user_trailers;
DROP POLICY IF EXISTS "Company members can manage trailers" ON public.user_trailers;

CREATE POLICY "Company members can view trailers" ON public.user_trailers
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);

CREATE POLICY "Company members can manage trailers" ON public.user_trailers
FOR ALL USING (
  user_id = auth.uid() 
  OR license_id = public.get_user_license_id(auth.uid())
);