-- =====================================================
-- Create favorite_addresses table for company-wide sharing
-- =====================================================

CREATE TABLE public.favorite_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  postal_code text,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  category text DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_name text
);

-- Enable RLS
ALTER TABLE public.favorite_addresses ENABLE ROW LEVEL SECURITY;

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorite_addresses;

-- RLS Policies - Company members can view/edit all favorites
CREATE POLICY "favorite_addresses_select_own_company" ON public.favorite_addresses
  FOR SELECT TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "favorite_addresses_insert_own_company" ON public.favorite_addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND license_id = public.get_user_license_id(auth.uid())
  );

CREATE POLICY "favorite_addresses_update_own_company" ON public.favorite_addresses
  FOR UPDATE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

CREATE POLICY "favorite_addresses_delete_own_company" ON public.favorite_addresses
  FOR DELETE TO authenticated
  USING (license_id = public.get_user_license_id(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_favorite_addresses_license ON public.favorite_addresses(license_id);
CREATE INDEX idx_favorite_addresses_category ON public.favorite_addresses(category);