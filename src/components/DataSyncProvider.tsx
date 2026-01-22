import { useEffect, useRef, useCallback, useState, createContext, useContext } from 'react';
import { useApp } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDataSync, getUserLicenseId } from '@/hooks/useDataSync';
import { useCompanyRealtimeSync } from '@/hooks/useRealtimeSync';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { Driver, FixedCharge } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Debounce interval in ms - reduced for faster sync (5 seconds)
const SYNC_DEBOUNCE = 5000;

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
  };
};

const DataSyncActionsContext = createContext<DataSyncActions | undefined>(undefined);

export function useDataSyncActions() {
  const ctx = useContext(DataSyncActionsContext);
  if (!ctx) throw new Error('useDataSyncActions must be used within DataSyncProvider');
  return ctx;
}

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { drivers, charges, setDrivers, setCharges } = useApp();
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const [trailers, setTrailers] = useLocalStorage<Trailer[]>('optiflow_trailers', []);
  const [interimDrivers, setInterimDrivers] = useLocalStorage<Driver[]>('optiflow_interim_drivers', []);
  const { syncAllData, loadCompanyData, manualSync, syncStatus } = useDataSync();
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedCompanyData = useRef<boolean>(false);

  // Get license ID on mount
  useEffect(() => {
    const fetchContext = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lid = await getUserLicenseId(user.id);
        if (lid !== licenseId) {
          // Reset flag to allow reloading company data when license changes
          hasLoadedCompanyData.current = false;
        }
        setLicenseId(lid);
      }
    };
    fetchContext();
  }, [licenseId]);

  // Handle realtime data changes from other users
  const handleRealtimeChange = useCallback((
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
  ) => {
    const record = payload.new || payload.old;
    
    console.log(`[DataSyncProvider] Realtime ${eventType} on ${table}:`, record);

    switch (table) {
      case 'user_vehicles':
        if (eventType === 'DELETE') {
          setVehicles(prev => prev.filter(v => v.id !== record?.local_id));
        } else {
          const vehicleData = record?.vehicle_data as Vehicle;
          if (vehicleData) {
            setVehicles(prev => {
              const exists = prev.find(v => v.id === vehicleData.id);
              if (exists) {
                return prev.map(v => v.id === vehicleData.id ? vehicleData : v);
              }
              return [...prev, vehicleData];
            });
          }
        }
        break;

      case 'user_trailers':
        if (eventType === 'DELETE') {
          setTrailers(prev => prev.filter(t => t.id !== record?.local_id));
        } else {
          const trailerData = record?.trailer_data as Trailer;
          if (trailerData) {
            setTrailers(prev => {
              const exists = prev.find(t => t.id === trailerData.id);
              if (exists) {
                return prev.map(t => t.id === trailerData.id ? trailerData : t);
              }
              return [...prev, trailerData];
            });
          }
        }
        break;

      case 'user_drivers':
        if (eventType === 'DELETE') {
          const localId = record?.local_id;
          setDrivers(prev => prev.filter(d => d.id !== localId));
          setInterimDrivers(prev => prev.filter(d => d.id !== localId));
        } else {
          const driverData = record?.driver_data as Driver;
          const driverType = record?.driver_type;
          if (driverData) {
            if (driverType === 'interim') {
              setInterimDrivers(prev => {
                const exists = prev.find(d => d.id === driverData.id);
                if (exists) {
                  return prev.map(d => d.id === driverData.id ? driverData : d);
                }
                return [...prev, driverData];
              });
            } else {
              setDrivers(prev => {
                const exists = prev.find(d => d.id === driverData.id);
                if (exists) {
                  return prev.map(d => d.id === driverData.id ? driverData : d);
                }
                return [...prev, driverData];
              });
            }
          }
        }
        break;

      case 'user_charges':
        if (eventType === 'DELETE') {
          setCharges(prev => prev.filter(c => c.id !== record?.local_id));
        } else {
          const chargeData = record?.charge_data as FixedCharge;
          if (chargeData) {
            setCharges(prev => {
              const exists = prev.find(c => c.id === chargeData.id);
              if (exists) {
                return prev.map(c => c.id === chargeData.id ? chargeData : c);
              }
              return [...prev, chargeData];
            });
          }
        }
        break;
    }
  }, [setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges]);

  // Subscribe to realtime changes for company data
  useCompanyRealtimeSync({
    licenseId,
    onDataChange: handleRealtimeChange,
    enabled: !!licenseId,
  });

  // Merge cloud data with local data (don't replace, add what's missing)
  const mergeWithLocalData = useCallback((companyData: any) => {
    if (!companyData) return;

    // Merge vehicles: keep local, add from cloud if not exists
    const cloudVehicles = (companyData.vehicles || [])
      .map((v: any) => v.vehicle_data as Vehicle)
      .filter(Boolean);
    
    setVehicles(prev => {
      const localIds = new Set(prev.map(v => v.id));
      const newFromCloud = cloudVehicles.filter((cv: Vehicle) => !localIds.has(cv.id));
      return [...prev, ...newFromCloud];
    });

    // Merge trailers
    const cloudTrailers = (companyData.trailers || [])
      .map((t: any) => t.trailer_data as Trailer)
      .filter(Boolean);
    
    setTrailers(prev => {
      const localIds = new Set(prev.map(t => t.id));
      const newFromCloud = cloudTrailers.filter((ct: Trailer) => !localIds.has(ct.id));
      return [...prev, ...newFromCloud];
    });

    // Merge CDI drivers
    const cdiDrivers = (companyData.drivers || [])
      .filter((d: any) => d.driver_type === 'cdi')
      .map((d: any) => d.driver_data as Driver)
      .filter(Boolean);
    
    setDrivers(prev => {
      const localIds = new Set(prev.map(d => d.id));
      const newFromCloud = cdiDrivers.filter((cd: Driver) => !localIds.has(cd.id));
      return [...prev, ...newFromCloud];
    });

    // Merge interim drivers
    const interimDriversCloud = (companyData.drivers || [])
      .filter((d: any) => d.driver_type === 'interim')
      .map((d: any) => d.driver_data as Driver)
      .filter(Boolean);
    
    setInterimDrivers(prev => {
      const localIds = new Set(prev.map(d => d.id));
      const newFromCloud = interimDriversCloud.filter((cd: Driver) => !localIds.has(cd.id));
      return [...prev, ...newFromCloud];
    });

    // Merge charges
    const cloudCharges = (companyData.charges || [])
      .map((c: any) => c.charge_data as FixedCharge)
      .filter(Boolean);
    
    setCharges(prev => {
      const localIds = new Set(prev.map(c => c.id));
      const newFromCloud = cloudCharges.filter((cc: FixedCharge) => !localIds.has(cc.id));
      return [...prev, ...newFromCloud];
    });
  }, [setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges]);

  // Load company-shared data on initial auth or when licenseId changes
  // Now we MERGE instead of REPLACE to keep user's local session intact
  useEffect(() => {
    const loadSharedData = async () => {
      // Wait for license ID to be resolved
      if (!licenseId) {
        console.log('[DataSyncProvider] Waiting for licenseId...');
        return;
      }
      
      if (hasLoadedCompanyData.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[DataSyncProvider] Loading and merging company data for licenseId:', licenseId);
      const companyData = await loadCompanyData();
      if (companyData) {
        hasLoadedCompanyData.current = true;
        console.log('[DataSyncProvider] Merging company data:', {
          vehicles: companyData.vehicles.length,
          drivers: companyData.drivers.length,
          charges: companyData.charges.length,
          trailers: companyData.trailers.length,
        });

        // MERGE cloud data with local data instead of replacing
        mergeWithLocalData(companyData);
      }
    };

    loadSharedData();
  }, [licenseId, loadCompanyData, mergeWithLocalData]);

   const applyCompanyData = useCallback((companyData: any) => {
     if (!companyData) return;
     // Use merge logic instead of replace
     mergeWithLocalData(companyData);
   }, [mergeWithLocalData]);

  const forceSync = useCallback(async () => {
    try {
      // 1) Push local changes to cloud
      await manualSync(vehicles, drivers, interimDrivers, charges, trailers);

      // 2) Pull back company data and MERGE (not replace)
      hasLoadedCompanyData.current = false;
      const companyData = await loadCompanyData();
      if (companyData) {
        hasLoadedCompanyData.current = true;
        mergeWithLocalData(companyData);
      }
      
      // Clear errors on successful sync
      setSyncErrors([]);
    } catch (error: any) {
      setSyncErrors(prev => [...prev.slice(-4), {
        table: 'global',
        message: error?.message || 'Sync failed',
        timestamp: new Date(),
      }]);
    }
  }, [manualSync, vehicles, drivers, interimDrivers, charges, trailers, loadCompanyData, mergeWithLocalData]);

  const clearErrors = useCallback(() => setSyncErrors([]), []);

  useEffect(() => {
    const scheduleSync = async () => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = Date.now();
      const timeSinceLastSync = now - lastSyncRef.current;

      if (timeSinceLastSync >= SYNC_DEBOUNCE) {
        // Sync immediately
        lastSyncRef.current = now;
        await syncAllData(vehicles, drivers, interimDrivers, charges, trailers);
      } else {
        // Schedule sync for later
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(async () => {
          lastSyncRef.current = Date.now();
          await syncAllData(vehicles, drivers, interimDrivers, charges, trailers);
        }, SYNC_DEBOUNCE - timeSinceLastSync);
      }
    };

    scheduleSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [vehicles, drivers, interimDrivers, charges, trailers, syncAllData]);

  // Initial sync on mount and auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Reset the flag to load company data again
        hasLoadedCompanyData.current = false;
        
        // Update license ID
        const lid = await getUserLicenseId(session.user.id);
        setLicenseId(lid);
        
        // Sync immediately on sign in
        lastSyncRef.current = Date.now();
        await syncAllData(vehicles, drivers, interimDrivers, charges, trailers);
      } else if (event === 'SIGNED_OUT') {
        setLicenseId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [vehicles, drivers, interimDrivers, charges, trailers, syncAllData]);

  return (
    <DataSyncActionsContext.Provider value={{
      forceSync,
      isSyncing: syncStatus.isSyncing,
      lastSyncAt: syncStatus.lastSyncAt,
      syncErrors,
      clearErrors,
      stats: {
        vehicleCount: syncStatus.vehicleCount,
        driverCount: syncStatus.driverCount,
        chargeCount: syncStatus.chargeCount,
        trailerCount: syncStatus.trailerCount,
      },
    }}>
      {children}
    </DataSyncActionsContext.Provider>
  );
}
