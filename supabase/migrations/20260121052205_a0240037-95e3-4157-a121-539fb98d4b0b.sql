-- Enable realtime for user_charges (other tables already have realtime enabled)
-- Check and add only if not already member
DO $$
BEGIN
  -- Try to add user_charges
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_charges;
  EXCEPTION WHEN duplicate_object THEN
    -- Already added, ignore
    NULL;
  END;
  
  -- Try to add user_drivers  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_drivers;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- Try to add user_trailers
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trailers;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;