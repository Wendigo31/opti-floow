-- Add max_users column to licenses table
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1;

-- Set max_users based on existing plan types
UPDATE public.licenses SET max_users = 1 WHERE plan_type = 'start';
UPDATE public.licenses SET max_users = 3 WHERE plan_type = 'pro';
UPDATE public.licenses SET max_users = 999 WHERE plan_type = 'enterprise';

-- Create company_users table to link multiple users to one license
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  display_name TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(license_id, user_id),
  UNIQUE(license_id, email)
);

-- Create index for faster lookups
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_company_users_license_id ON public.company_users(license_id);
CREATE INDEX idx_company_users_email ON public.company_users(email);

-- Enable RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of their company
CREATE POLICY "Users can view their company members"
ON public.company_users
FOR SELECT
USING (
  license_id IN (
    SELECT license_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Policy: Owners and admins can insert new members
CREATE POLICY "Owners and admins can invite members"
ON public.company_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.license_id = license_id
    AND cu.user_id = auth.uid()
    AND cu.role IN ('owner', 'admin')
    AND cu.is_active = true
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.company_users WHERE license_id = license_id
  )
);

-- Policy: Owners can update members, admins can update members (not owners)
CREATE POLICY "Owners and admins can update members"
ON public.company_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.license_id = company_users.license_id
    AND cu.user_id = auth.uid()
    AND cu.role = 'owner'
    AND cu.is_active = true
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.license_id = company_users.license_id
      AND cu.user_id = auth.uid()
      AND cu.role = 'admin'
      AND cu.is_active = true
    )
    AND company_users.role != 'owner'
  )
);

-- Policy: Only owners can delete members
CREATE POLICY "Owners can delete members"
ON public.company_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.license_id = company_users.license_id
    AND cu.user_id = auth.uid()
    AND cu.role = 'owner'
    AND cu.is_active = true
  )
  AND company_users.role != 'owner'
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_users_updated_at
BEFORE UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create invitations table for pending invites
CREATE TABLE public.company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(license_id, email)
);

-- Enable RLS on invitations
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can view their invitations
CREATE POLICY "Company members can view invitations"
ON public.company_invitations
FOR SELECT
USING (
  license_id IN (
    SELECT license_id FROM public.company_users WHERE user_id = auth.uid()
  )
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
ON public.company_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.license_id = license_id
    AND cu.user_id = auth.uid()
    AND cu.role IN ('owner', 'admin')
    AND cu.is_active = true
  )
);

-- Policy: Owners and admins can delete invitations
CREATE POLICY "Owners and admins can delete invitations"
ON public.company_invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.license_id = company_invitations.license_id
    AND cu.user_id = auth.uid()
    AND cu.role IN ('owner', 'admin')
    AND cu.is_active = true
  )
);