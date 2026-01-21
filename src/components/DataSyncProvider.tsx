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
    const fetchLicenseId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lid = await getUserLicenseId(user.id);
        setLicenseId(lid);
      }
    };
    fetchLicenseId();
  }, []);

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

  // Load company-shared data on initial auth
  useEffect(() => {
    const loadSharedData = async () => {
      if (hasLoadedCompanyData.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const companyData = await loadCompanyData();
      if (companyData) {
        hasLoadedCompanyData.current = true;
        console.log('[DataSyncProvider] Loaded company data:', {
          vehicles: companyData.vehicles.length,
          drivers: companyData.drivers.length,
          charges: companyData.charges.length,
          trailers: companyData.trailers.length,
        });

        // Replace local data with company data for full sync
        if (companyData.vehicles.length > 0) {
          const cloudVehicles = companyData.vehicles
            .map((v: any) => v.vehicle_data as Vehicle)
            .filter(Boolean);
          if (cloudVehicles.length > 0) {
            setVehicles(cloudVehicles);
          }
        }

        if (companyData.trailers.length > 0) {
          const cloudTrailers = companyData.trailers
            .map((t: any) => t.trailer_data as Trailer)
            .filter(Boolean);
          if (cloudTrailers.length > 0) {
            setTrailers(cloudTrailers);
          }
        }

        if (companyData.drivers.length > 0) {
          const cdiDrivers = companyData.drivers
            .filter((d: any) => d.driver_type === 'cdi')
            .map((d: any) => d.driver_data as Driver)
            .filter(Boolean);
          const interimDriversCloud = companyData.drivers
            .filter((d: any) => d.driver_type === 'interim')
            .map((d: any) => d.driver_data as Driver)
            .filter(Boolean);

          if (cdiDrivers.length > 0) {
            setDrivers(cdiDrivers);
          }
          if (interimDriversCloud.length > 0) {
            setInterimDrivers(interimDriversCloud);
          }
        }

        if (companyData.charges.length > 0) {
          const cloudCharges = companyData.charges
            .map((c: any) => c.charge_data as FixedCharge)
            .filter(Boolean);
          if (cloudCharges.length > 0) {
            setCharges(cloudCharges);
          }
        }
      }
    };

    loadSharedData();
  }, [loadCompanyData, setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges]);

  const applyCompanyData = useCallback((companyData: any) => {
    if (!companyData) return;

    if (companyData.vehicles?.length > 0) {
      const cloudVehicles = companyData.vehicles
        .map((v: any) => v.vehicle_data as Vehicle)
        .filter(Boolean);
      if (cloudVehicles.length > 0) setVehicles(cloudVehicles);
    }

    if (companyData.trailers?.length > 0) {
      const cloudTrailers = companyData.trailers
        .map((t: any) => t.trailer_data as Trailer)
        .filter(Boolean);
      if (cloudTrailers.length > 0) setTrailers(cloudTrailers);
    }

    if (companyData.drivers?.length > 0) {
      const cdiDrivers = companyData.drivers
        .filter((d: any) => d.driver_type === 'cdi')
        .map((d: any) => d.driver_data as Driver)
        .filter(Boolean);
      const interimDriversCloud = companyData.drivers
        .filter((d: any) => d.driver_type === 'interim')
        .map((d: any) => d.driver_data as Driver)
        .filter(Boolean);

      if (cdiDrivers.length > 0) setDrivers(cdiDrivers);
      if (interimDriversCloud.length > 0) setInterimDrivers(interimDriversCloud);
    }

    if (companyData.charges?.length > 0) {
      const cloudCharges = companyData.charges
        .map((c: any) => c.charge_data as FixedCharge)
        .filter(Boolean);
      if (cloudCharges.length > 0) setCharges(cloudCharges);
    }
  }, [setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges]);

  const forceSync = useCallback(async () => {
    try {
      // 1) Push local changes
      await manualSync(vehicles, drivers, interimDrivers, charges, trailers);

      // 2) Pull back company data (truth source) so all sessions converge
      hasLoadedCompanyData.current = false;
      const companyData = await loadCompanyData();
      if (companyData) {
        hasLoadedCompanyData.current = true;
        applyCompanyData(companyData);
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
  }, [manualSync, vehicles, drivers, interimDrivers, charges, trailers, loadCompanyData, applyCompanyData]);

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
