import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that automatically syncs the license_features schema on app startup.
 * Runs silently in the background - only logs errors to console.
 */
export function useSchemaSync() {
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per app session
    if (hasRun.current) return;
    hasRun.current = true;

    const syncSchema = async () => {
      try {
        // Check schema status
        const { data, error } = await supabase.functions.invoke('sync-features-schema', {
          body: { action: 'check' },
        });

        if (error) {
          console.warn('[SchemaSync] Could not check schema:', error.message);
          return;
        }

        if (data?.success && !data.is_synchronized) {
          console.log('[SchemaSync] Schema needs sync:', data.missing_columns);
          
          // Log for visibility but don't auto-sync without admin token
          // The SchemaSyncManager in admin will handle actual sync
          console.log('[SchemaSync] Missing columns:', data.missing_columns?.join(', '));
        } else if (data?.is_synchronized) {
          console.log('[SchemaSync] Schema is synchronized');
        }
      } catch (err) {
        console.warn('[SchemaSync] Error during schema check:', err);
      }
    };

    // Run after a short delay to not block app startup
    const timeoutId = setTimeout(syncSchema, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);
}
