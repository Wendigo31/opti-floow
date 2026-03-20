
-- Table for driver absences (sick leave, work accidents, vacations)
CREATE TABLE public.driver_absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id TEXT NOT NULL,
  license_id UUID NOT NULL,
  user_id UUID NOT NULL,
  absence_type TEXT NOT NULL CHECK (absence_type IN ('maladie', 'accident_travail', 'conges', 'autre')),
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_absences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "driver_absences_select_own_company"
ON public.driver_absences FOR SELECT TO authenticated
USING (license_id = get_user_license_id(auth.uid()));

CREATE POLICY "driver_absences_insert_own_company"
ON public.driver_absences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND license_id = get_user_license_id(auth.uid()));

CREATE POLICY "driver_absences_update_own_company"
ON public.driver_absences FOR UPDATE TO authenticated
USING (license_id = get_user_license_id(auth.uid()));

CREATE POLICY "driver_absences_delete_own_company"
ON public.driver_absences FOR DELETE TO authenticated
USING (license_id = get_user_license_id(auth.uid()));

-- Enable realtime
ALTER TABLE public.driver_absences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_absences;

-- Trigger for updated_at
CREATE TRIGGER update_driver_absences_updated_at
BEFORE UPDATE ON public.driver_absences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
