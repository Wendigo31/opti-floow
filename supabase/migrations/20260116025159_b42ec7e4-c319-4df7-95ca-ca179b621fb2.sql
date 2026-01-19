-- Table pour stocker l'historique des connexions utilisateur
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  location TEXT,
  success BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Politique pour que les admins puissent tout voir (via edge function avec service role)
-- Les utilisateurs normaux ne peuvent pas accéder directement

-- Ajouter des colonnes pour contrôler la visibilité des infos dans "Mon compte"
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS show_user_info BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_company_info BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_address_info BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_license_info BOOLEAN DEFAULT true;