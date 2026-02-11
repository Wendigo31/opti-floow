
-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role TEXT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  site_city TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies: same access as client_addresses (through parent client's license)
CREATE POLICY "client_contacts_select_own_company"
ON public.client_contacts FOR SELECT
USING (client_id IN (SELECT id FROM clients WHERE license_id = get_user_license_id(auth.uid())));

CREATE POLICY "client_contacts_insert_own_company"
ON public.client_contacts FOR INSERT
WITH CHECK (client_id IN (SELECT id FROM clients WHERE license_id = get_user_license_id(auth.uid())));

CREATE POLICY "client_contacts_update_own_company"
ON public.client_contacts FOR UPDATE
USING (client_id IN (SELECT id FROM clients WHERE license_id = get_user_license_id(auth.uid())));

CREATE POLICY "client_contacts_delete_own_company"
ON public.client_contacts FOR DELETE
USING (client_id IN (SELECT id FROM clients WHERE license_id = get_user_license_id(auth.uid())));
