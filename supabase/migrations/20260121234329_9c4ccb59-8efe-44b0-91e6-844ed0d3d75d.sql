-- Ensure ON CONFLICT(license_id, local_id) works by providing NON-partial unique indexes.
-- Postgres cannot infer partial unique indexes for ON CONFLICT without a matching predicate.

-- user_vehicles
DROP INDEX IF EXISTS public.user_vehicles_license_local_uniq;
CREATE UNIQUE INDEX user_vehicles_license_local_uniq
ON public.user_vehicles (license_id, local_id);

-- user_trailers
DROP INDEX IF EXISTS public.user_trailers_license_local_uniq;
CREATE UNIQUE INDEX user_trailers_license_local_uniq
ON public.user_trailers (license_id, local_id);

-- user_drivers
DROP INDEX IF EXISTS public.user_drivers_license_local_uniq;
CREATE UNIQUE INDEX user_drivers_license_local_uniq
ON public.user_drivers (license_id, local_id);

-- user_charges
DROP INDEX IF EXISTS public.user_charges_license_local_uniq;
CREATE UNIQUE INDEX user_charges_license_local_uniq
ON public.user_charges (license_id, local_id);