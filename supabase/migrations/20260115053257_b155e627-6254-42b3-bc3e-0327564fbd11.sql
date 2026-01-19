-- Enable realtime for app_updates table to support push notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;