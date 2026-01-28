import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useCloudSession } from '@/hooks/useCloudSession';
import { toast } from 'sonner';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

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

  const { 
    isLoading, 
    isSaving, 
    lastSavedAt, 
    error,
    forceSave,
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

      toast.success('Session restaurée depuis le cloud', {
        icon: <Cloud className="w-4 h-4" />,
        duration: 3000,
      });
    },
  });

  // Show error toast if cloud session fails
  useEffect(() => {
    if (error) {
      toast.error('Erreur de synchronisation cloud', {
        description: error,
        icon: <CloudOff className="w-4 h-4" />,
      });
    }
  }, [error]);

  // Log save status for debugging
  useEffect(() => {
    if (lastSavedAt) {
      console.log('[CloudSessionProvider] Last saved at:', lastSavedAt.toLocaleTimeString());
    }
  }, [lastSavedAt]);

  return (
    <>
      {children}
      
      {/* Save status indicator (bottom right) */}
      <div className="fixed bottom-4 right-4 z-50">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full text-sm text-muted-foreground shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement session...</span>
          </div>
        ) : isSaving ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full text-sm text-primary shadow-lg">
            <Cloud className="w-4 h-4 animate-pulse" />
            <span>Sauvegarde...</span>
          </div>
        ) : lastSavedAt ? (
          <button
            onClick={forceSave}
            className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-full text-sm text-success shadow-lg hover:bg-success/20 transition-colors cursor-pointer"
            title={`Dernière sauvegarde: ${lastSavedAt.toLocaleTimeString()}`}
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline">Cloud sync</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
