-- Set REPLICA IDENTITY FULL on all synchronized tables for proper realtime updates
-- This ensures UPDATE and DELETE events contain the full row data (OLD and NEW)

ALTER TABLE public.user_vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.user_trailers REPLICA IDENTITY FULL;
ALTER TABLE public.user_drivers REPLICA IDENTITY FULL;
ALTER TABLE public.user_charges REPLICA IDENTITY FULL;
ALTER TABLE public.saved_tours REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;
ALTER TABLE public.charge_presets REPLICA IDENTITY FULL;