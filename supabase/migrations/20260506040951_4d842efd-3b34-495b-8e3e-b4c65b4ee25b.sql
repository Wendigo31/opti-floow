
ALTER TABLE public.licenses 
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS last_stripe_sync_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_licenses_stripe_customer ON public.licenses(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_licenses_stripe_subscription ON public.licenses(stripe_subscription_id);
