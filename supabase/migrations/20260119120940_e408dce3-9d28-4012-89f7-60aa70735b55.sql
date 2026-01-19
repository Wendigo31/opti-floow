-- Enable realtime for company data tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trailers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_tours;