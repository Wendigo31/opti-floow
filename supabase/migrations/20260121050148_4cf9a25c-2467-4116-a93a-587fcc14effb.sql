-- Add company_identifier column to licenses table
ALTER TABLE public.licenses
ADD COLUMN company_identifier text;

-- Add unique constraint on company_identifier
ALTER TABLE public.licenses
ADD CONSTRAINT licenses_company_identifier_key UNIQUE (company_identifier);

-- Create index for faster lookups
CREATE INDEX idx_licenses_company_identifier ON public.licenses(company_identifier) WHERE company_identifier IS NOT NULL;