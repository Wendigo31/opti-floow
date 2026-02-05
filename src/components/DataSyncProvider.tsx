import { useEffect, useRef, useCallback, useState, createContext, useContext } from 'react';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useClients } from '@/hooks/useClients';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useTrips } from '@/hooks/useTrips';
import { useQuotes } from '@/hooks/useQuotes';
import { useLicenseContext } from '@/context/LicenseContext';

// Sync interval in ms (5 minutes - reduced frequency since we have realtime)
const SYNC_INTERVAL = 5 * 60 * 1000;

type SyncError = {
  table: string;
  message: string;
  timestamp: Date;
};

type DataSyncActions = {
  forceSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncErrors: SyncError[];
  clearErrors: () => void;
  stats: {
    vehicleCount: number;
    driverCount: number;
    chargeCount: number;
    trailerCount: number;
    clientCount: number;
    tourCount: number;
    tripCount: number;
    quoteCount: number;
  };
};

const DataSyncActionsContext = createContext<DataSyncActions | undefined>(undefined);

export function useDataSyncActions() {
  const ctx = useContext(DataSyncActionsContext);
  if (!ctx) throw new Error('useDataSyncActions must be used within DataSyncProvider');
  return ctx;
}

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { licenseId, authUserId } = useLicenseContext();
  const { vehicles, fetchVehicles } = useCloudVehicles();
  const { trailers, fetchTrailers } = useCloudTrailers();
  const { cdiDrivers, interimDrivers, fetchDrivers } = useCloudDrivers();
  const { charges, fetchCharges } = useCloudCharges();
  const { clients, fetchClients } = useClients();
  const { tours, fetchTours } = useSavedTours();
  const { trips, fetchTrips } = useTrips();
  const { quotes, fetchQuotes } = useQuotes();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasSyncedRef = useRef(false);

  // Clear legacy local storage caches on first cloud sync
  useEffect(() => {
    const CACHE_CLEARED_KEY = 'optiflow_cache_cleared_v2';
    const cacheClearedFlag = localStorage.getItem(CACHE_CLEARED_KEY);
    if (!cacheClearedFlag && licenseId) {
      // Clear old cache keys to force cloud sync
      localStorage.removeItem('optiflow_drivers_cache');
      localStorage.removeItem('optiflow_interim_drivers_cache');
      localStorage.removeItem('optiflow_charges_cache');
      localStorage.removeItem('optiflow_vehicles_cache');
      localStorage.removeItem('optiflow_trailers_cache');
      localStorage.setItem(CACHE_CLEARED_KEY, 'true');
      console.log('[DataSync] Cleared legacy caches for cloud sync');
    }
  }, [licenseId]);

  // Force sync all cloud data
  const forceSync = useCallback(async () => {
    if (!isMountedRef.current || !authUserId || !licenseId) return;
    if (isSyncing) return; // Prevent concurrent syncs
    
    setIsSyncing(true);
    
    try {
      // Fetch all data from cloud in parallel with error handling for each
      const results = await Promise.allSettled([
        fetchVehicles(),
        fetchTrailers(),
        fetchDrivers(),
        fetchCharges(),
        fetchClients(),
        fetchTours(),
        fetchTrips(),
        fetchQuotes(),
      ]);
      
      // Check for any rejected promises
      const errors: SyncError[] = [];
      const tableNames = ['vehicles', 'trailers', 'drivers', 'charges', 'clients', 'tours', 'trips', 'quotes'];
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push({
            table: tableNames[index],
            message: result.reason?.message || 'Erreur de synchronisation',
            timestamp: new Date(),
          });
        }
      });
      
      if (isMountedRef.current) {
        setLastSyncAt(new Date());
        if (errors.length > 0) {
          setSyncErrors(prev => [...prev.slice(-4), ...errors.slice(0, 5 - prev.length)]);
        } else {
          setSyncErrors([]);
        }
      }
    } catch (error: any) {
      console.error('[DataSync] Sync error:', error);
      if (isMountedRef.current) {
        setSyncErrors(prev => [...prev.slice(-4), {
          table: 'global',
          message: error?.message || 'Erreur de synchronisation',
          timestamp: new Date(),
        }]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [authUserId, licenseId, isSyncing, fetchVehicles, fetchTrailers, fetchDrivers, fetchCharges, fetchClients, fetchTours, fetchTrips, fetchQuotes]);

  const clearErrors = useCallback(() => setSyncErrors([]), []);

  // Initial sync when license context is ready, then periodic sync
  useEffect(() => {
    isMountedRef.current = true;

    // Only sync once when licenseId becomes available
    if (licenseId && authUserId && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      void forceSync();
    }

    // Setup interval for periodic sync (less frequent since realtime handles updates)
    syncIntervalRef.current = setInterval(() => {
      if (licenseId && authUserId) {
        void forceSync();
      }
    }, SYNC_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [licenseId, authUserId, forceSync]);

  // Calculate stats from cloud data
  const stats = {
    vehicleCount: vehicles.length,
    driverCount: cdiDrivers.length + interimDrivers.length,
    chargeCount: charges.length,
    trailerCount: trailers.length,
    clientCount: clients.length,
    tourCount: tours.length,
    tripCount: trips.length,
    quoteCount: quotes.length,
  };

  return (
    <DataSyncActionsContext.Provider value={{
      forceSync,
      isSyncing,
      lastSyncAt,
      syncErrors,
      clearErrors,
      stats,
    }}>
      {children}
    </DataSyncActionsContext.Provider>
  );
}
