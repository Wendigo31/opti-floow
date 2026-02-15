
-- =============================================
-- CLEANUP: Remove duplicate INSERT RLS policies
-- =============================================

-- user_drivers: Keep "user_drivers_insert_own_company" (most restrictive), drop the other two
DROP POLICY IF EXISTS "Users can create their own drivers" ON public.user_drivers;
DROP POLICY IF EXISTS "Users can insert own drivers" ON public.user_drivers;

-- user_vehicles: Keep "user_vehicles_insert_own_company" (most restrictive), drop the generic one
DROP POLICY IF EXISTS "Users can create their own vehicles" ON public.user_vehicles;
