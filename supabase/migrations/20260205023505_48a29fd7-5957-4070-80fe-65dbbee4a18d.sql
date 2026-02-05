
-- Enable REPLICA IDENTITY FULL on all operational tables for complete realtime sync
-- This ensures DELETE and UPDATE events broadcast full row data

ALTER TABLE public.user_vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.user_trailers REPLICA IDENTITY FULL;
ALTER TABLE public.user_drivers REPLICA IDENTITY FULL;
ALTER TABLE public.user_charges REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.saved_tours REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.planning_entries REPLICA IDENTITY FULL;
ALTER TABLE public.charge_presets REPLICA IDENTITY FULL;
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;
ALTER TABLE public.active_itinerary_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.search_history REPLICA IDENTITY FULL;
ALTER TABLE public.client_addresses REPLICA IDENTITY FULL;
