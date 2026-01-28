import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VehicleParams, TripCalculation, AppSettings } from '@/types';

// Auto-save interval: 60 seconds
const AUTO_SAVE_INTERVAL = 60_000;

interface CloudSession {
  id: string;
  user_id: string;
  license_id: string;
  vehicle_params: VehicleParams;
  trip_params: TripCalculation;
  app_settings: AppSettings;
  selected_driver_ids: string[];
  last_saved_at: string;
  created_at: string;
  updated_at: string;
}

interface UseCloudSessionOptions {
  vehicle: VehicleParams;
  trip: TripCalculation;
  settings: AppSettings;
  selectedDriverIds: string[];
  onSessionLoaded?: (session: {
    vehicle: VehicleParams;
    trip: TripCalculation;
    settings: AppSettings;
    selectedDriverIds: string[];
  }) => void;
}

// Helper to bypass TypeScript until types are regenerated
const getSessionsTable = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('user_sessions');
};

/**
 * Hook to manage cloud session auto-save every 60 seconds.
 * Each user has a unique session linked to their user_id and license_id.
 */
export function useCloudSession({
  vehicle,
  trip,
  settings,
  selectedDriverIds,
  onSessionLoaded,
}: UseCloudSessionOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const licenseIdRef = useRef<string | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const onSessionLoadedRef = useRef(onSessionLoaded);

  // Keep callback ref updated
  useEffect(() => {
    onSessionLoadedRef.current = onSessionLoaded;
  }, [onSessionLoaded]);

  // Fetch or create session for current user
  const loadSession = useCallback(async () => {
    if (hasLoadedRef.current) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) {
        setIsLoading(false);
        return;
      }

      userIdRef.current = user.id;

      // Get user's license_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('license_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!companyUser?.license_id || !isMountedRef.current) {
        setIsLoading(false);
        return;
      }

      licenseIdRef.current = companyUser.license_id;

      // Try to load existing session
      const { data: existingSession, error: fetchError } = await getSessionsTable()
        .select('*')
        .eq('user_id', user.id)
        .eq('license_id', companyUser.license_id)
        .maybeSingle();

      if (fetchError) {
        console.error('[CloudSession] Fetch error:', fetchError);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (existingSession && isMountedRef.current) {
        const session = existingSession as CloudSession;
        setSessionId(session.id);
        setLastSavedAt(new Date(session.last_saved_at));
        hasLoadedRef.current = true;

        // Call the callback to restore state
        if (onSessionLoadedRef.current) {
          onSessionLoadedRef.current({
            vehicle: session.vehicle_params as VehicleParams,
            trip: session.trip_params as TripCalculation,
            settings: session.app_settings as AppSettings,
            selectedDriverIds: session.selected_driver_ids || [],
          });
        }

        console.log('[CloudSession] Session loaded from cloud');
      } else {
        console.log('[CloudSession] No existing session, will create on first save');
        hasLoadedRef.current = true;
      }
    } catch (err: any) {
      console.error('[CloudSession] Load error:', err);
      setError(err.message);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Save current state to cloud
  const saveSession = useCallback(async () => {
    if (!userIdRef.current || !licenseIdRef.current || !isMountedRef.current) {
      return false;
    }

    setIsSaving(true);

    try {
      const sessionData = {
        user_id: userIdRef.current,
        license_id: licenseIdRef.current,
        vehicle_params: vehicle,
        trip_params: trip,
        app_settings: settings,
        selected_driver_ids: selectedDriverIds,
        last_saved_at: new Date().toISOString(),
      };

      let result;

      if (sessionId) {
        // Update existing session
        result = await getSessionsTable()
          .update(sessionData)
          .eq('id', sessionId)
          .select()
          .single();
      } else {
        // Create new session (upsert)
        result = await getSessionsTable()
          .upsert(sessionData, {
            onConflict: 'user_id,license_id',
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (result.data && isMountedRef.current) {
        const session = result.data as CloudSession;
        setSessionId(session.id);
        setLastSavedAt(new Date(session.last_saved_at));
        console.log('[CloudSession] Session saved to cloud');
      }

      return true;
    } catch (err: any) {
      console.error('[CloudSession] Save error:', err);
      if (isMountedRef.current) {
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [vehicle, trip, settings, selectedDriverIds, sessionId]);

  // Force save with toast feedback
  const forceSave = useCallback(async () => {
    const success = await saveSession();
    if (success) {
      toast.success('Session sauvegardée');
    } else {
      toast.error('Erreur de sauvegarde');
    }
    return success;
  }, [saveSession]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadSession();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadSession]);

  // Setup auto-save every 60 seconds
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    // Clear existing interval
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    // Setup new interval
    autoSaveIntervalRef.current = setInterval(() => {
      console.log('[CloudSession] Auto-save triggered');
      saveSession();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [saveSession]);

  // Save on auth state change (before logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        // Clear refs
        userIdRef.current = null;
        licenseIdRef.current = null;
        hasLoadedRef.current = false;
        setSessionId(null);
        setLastSavedAt(null);
      } else if (event === 'SIGNED_IN') {
        // Reload session for new user
        hasLoadedRef.current = false;
        loadSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSession]);

  // Subscribe to realtime updates for cross-device sync
  useEffect(() => {
    if (!userIdRef.current || !licenseIdRef.current) return;

    const channel = supabase
      .channel(`user_session_${userIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userIdRef.current}`,
        },
        (payload) => {
          // Only sync if update came from another device
          const newSession = payload.new as CloudSession;
          if (newSession && new Date(newSession.last_saved_at) > (lastSavedAt || new Date(0))) {
            console.log('[CloudSession] Received update from another device');
            setLastSavedAt(new Date(newSession.last_saved_at));
            
            if (onSessionLoadedRef.current) {
              onSessionLoadedRef.current({
                vehicle: newSession.vehicle_params as VehicleParams,
                trip: newSession.trip_params as TripCalculation,
                settings: newSession.app_settings as AppSettings,
                selectedDriverIds: newSession.selected_driver_ids || [],
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lastSavedAt]);

  return {
    isLoading,
    isSaving,
    lastSavedAt,
    error,
    saveSession,
    forceSave,
    refresh: loadSession,
  };
}
