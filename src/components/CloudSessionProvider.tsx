import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useCloudSession } from '@/hooks/useCloudSession';
import { supabase } from '@/integrations/supabase/client';
import { cloudActivity } from '@/lib/cloudStatus';

/**
 * Provider component that enables automatic cloud session saving every 60 seconds.
 * Must be rendered inside AppProvider.
 */
export function CloudSessionProvider({ children }: { children: React.ReactNode }) {
  const {
    vehicle,
    setVehicle,
    trip,
    setTrip,
    settings,
    setSettings,
    selectedDriverIds,
    setSelectedDriverIds,
  } = useApp();

  const hasRestoredRef = useRef(false);

  // Reset hasRestoredRef when user changes (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        console.log('[CloudSessionProvider] Auth changed, resetting restore flag');
        hasRestoredRef.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const { 
    isSaving, 
    lastSavedAt, 
    error,
  } = useCloudSession({
    vehicle,
    trip,
    settings,
    selectedDriverIds,
    onSessionLoaded: (session) => {
      // Only restore once on initial load
      if (hasRestoredRef.current) return;
      hasRestoredRef.current = true;

      console.log('[CloudSessionProvider] Restoring session from cloud');
      
      // Restore all state from cloud session
      if (session.vehicle) {
        setVehicle(session.vehicle);
      }
      if (session.trip) {
        setTrip(session.trip);
      }
      if (session.settings) {
        setSettings(session.settings);
      }
      if (session.selectedDriverIds) {
        setSelectedDriverIds(session.selectedDriverIds);
      }

      // Message de reprise de session : le même dans les 3 logiciels (lib/cloudStatus).
    },
  });

  // Sauvegarde de l'espace de travail : affichée par l'indicateur du cloud commun.
  useEffect(() => {
    if (!isSaving) return;
    return cloudActivity.begin();
  }, [isSaving]);
  useEffect(() => {
    if (lastSavedAt) cloudActivity.synced(lastSavedAt.getTime());
  }, [lastSavedAt]);
  useEffect(() => {
    if (error) cloudActivity.failed(`Sauvegarde de l'espace de travail impossible : ${error}`);
  }, [error]);

  return <>{children}</>;
}
