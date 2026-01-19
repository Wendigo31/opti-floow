-- Create table for app updates management
CREATE TABLE public.app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  release_notes TEXT,
  download_url TEXT,
  signature TEXT,
  pub_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  platform TEXT NOT NULL DEFAULT 'windows-x86_64',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Public read access for update checks (Tauri needs this)
CREATE POLICY "Anyone can read active updates" 
ON public.app_updates 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_app_updates_updated_at
BEFORE UPDATE ON public.app_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for version lookups
CREATE INDEX idx_app_updates_version ON public.app_updates(version);
CREATE INDEX idx_app_updates_platform ON public.app_updates(platform);