import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PWAUpdate {
  id: string;
  version: string;
  release_notes: string | null;
  pub_date: string;
  is_critical: boolean;
}

const DISMISSED_UPDATES_KEY = 'optiflow_dismissed_updates';

export function usePWAUpdates() {
  const [latestUpdate, setLatestUpdate] = useState<PWAUpdate | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  const getDismissedUpdates = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(DISMISSED_UPDATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const dismissUpdate = useCallback((updateId: string) => {
    const dismissed = getDismissedUpdates();
    if (!dismissed.includes(updateId)) {
      localStorage.setItem(DISMISSED_UPDATES_KEY, JSON.stringify([...dismissed, updateId]));
    }
    setShowNotification(false);
  }, [getDismissedUpdates]);

  const checkForUpdates = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-updates', {
        body: { action: 'list' },
      });

      if (error) {
        console.error('[usePWAUpdates] Error checking updates:', error);
        return;
      }

      // Filter for active PWA updates only
      const pwaUpdates = (data?.updates || [])
        .filter((u: any) => u.platform === 'pwa' && u.is_active)
        .sort((a: any, b: any) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime());

      if (pwaUpdates.length > 0) {
        const latest = pwaUpdates[0];
        const dismissedIds = getDismissedUpdates();
        
        const update: PWAUpdate = {
          id: latest.id,
          version: latest.version,
          release_notes: latest.release_notes,
          pub_date: latest.pub_date,
          is_critical: latest.download_url === 'critical',
        };

        setLatestUpdate(update);

        // Show notification only if not dismissed
        if (!dismissedIds.includes(update.id)) {
          setShowNotification(true);
          
          // Increment view count
          try {
            await supabase.functions.invoke('manage-updates', {
              body: { action: 'increment-download', updateId: update.id },
            });
          } catch (e) {
            // Non-critical, ignore
          }
        }
      }
    } catch (error) {
      console.error('[usePWAUpdates] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [getDismissedUpdates]);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();

    // Check periodically (every 30 minutes)
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    latestUpdate,
    showNotification,
    dismissUpdate,
    loading,
    checkForUpdates,
  };
}
