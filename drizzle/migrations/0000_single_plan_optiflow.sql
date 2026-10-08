ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_plan_type_check;
UPDATE public.licenses SET plan_type = 'optiflow' WHERE plan_type IS DISTINCT FROM 'optiflow';
ALTER TABLE public.licenses ALTER COLUMN plan_type SET DEFAULT 'optiflow';
ALTER TABLE public.licenses ADD CONSTRAINT licenses_plan_type_check CHECK (plan_type IS NULL OR plan_type = 'optiflow');