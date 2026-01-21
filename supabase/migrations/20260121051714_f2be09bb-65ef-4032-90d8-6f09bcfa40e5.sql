-- Update the role check constraint to include new roles
ALTER TABLE public.company_users 
DROP CONSTRAINT IF EXISTS company_users_role_check;

ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'direction'::text, 'responsable'::text, 'exploitation'::text]));