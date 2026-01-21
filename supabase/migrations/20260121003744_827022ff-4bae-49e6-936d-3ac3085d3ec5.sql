-- Enable realtime for trips, clients, and quotes
-- (saved_tours is already enabled)

-- Enable realtime for trips  
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- Enable realtime for clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

-- Enable realtime for quotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;