-- Add download count tracking to app_updates
ALTER TABLE public.app_updates ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;

-- Create index for faster stats queries
CREATE INDEX IF NOT EXISTS idx_app_updates_platform_active ON public.app_updates(platform, is_active);