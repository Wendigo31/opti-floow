-- Create table for storing active add-ons per license
CREATE TABLE public.license_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL,
  addon_name TEXT NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(license_id, addon_id)
);

-- Enable RLS
ALTER TABLE public.license_addons ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (via service role or admin token)
CREATE POLICY "Allow all access for authenticated users"
ON public.license_addons
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_license_addons_license_id ON public.license_addons(license_id);
CREATE INDEX idx_license_addons_addon_id ON public.license_addons(addon_id);

-- Add trigger for updated_at
CREATE TRIGGER update_license_addons_updated_at
BEFORE UPDATE ON public.license_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to licenses table for pricing info
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS base_monthly_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS addons_monthly_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS next_billing_date DATE;