import { useEffect, useRef, useCallback, useState, createContext, useContext } from 'react';
import { useApp } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDataSync, getUserLicenseId } from '@/hooks/useDataSync';
import { useCompanyRealtimeSync } from '@/hooks/useRealtimeSync';
import { useSyncDebug, type SyncOperation, type RealtimeStatus } from '@/hooks/useSyncDebug';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { Driver, FixedCharge } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  // Debug features
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  debugOperations: SyncOperation[];
  debugRealtimeStatus: Map<string, RealtimeStatus>;
  debugLicenseId: string | null;
  debugUserId: string | null;
  clearDebugOperations: () => void;
  reloadSection: (section: 'vehicles' | 'drivers' | 'charges' | 'trailers') => Promise<void>;
  isReloadingSection: Record<string, boolean>;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  const [isReloadingSection, setIsReloadingSection] = useState<Record<string, boolean>>({});
  
  // Debug state
  const syncDebug = useSyncDebug();
  
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedCompanyData = useRef<boolean>(false);

  // Get license ID and user ID on mount
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
        setUserId(user.id);
        syncDebug.setContext(lid, user.id);
      }
    };
    fetchContext();
  }, [licenseId, syncDebug]);

  // Reload a single section from the cloud
  const reloadSection = useCallback(async (section: 'vehicles' | 'drivers' | 'charges' | 'trailers') => {
    if (!licenseId) {
      toast.error('Aucune licence associée');
      return;
    }
    
    setIsReloadingSection(prev => ({ ...prev, [section]: true }));
    const startTime = Date.now();
    
    try {
      const tableMap: Record<string, 'user_vehicles' | 'user_drivers' | 'user_charges' | 'user_trailers'> = {
        vehicles: 'user_vehicles',
        drivers: 'user_drivers',
        charges: 'user_charges',
        trailers: 'user_trailers',
      };
      
      const tableName = tableMap[section];
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('license_id', licenseId);
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      syncDebug.logOperation(tableMap[section], 'select', data?.length || 0, true, undefined, duration);
      
      switch (section) {
        case 'vehicles':
          const cloudVehicles = (data || []).map((v: any) => v.vehicle_data as Vehicle).filter(Boolean);
          setVehicles(cloudVehicles);
          break;
        case 'drivers':
          const cdiDrivers = (data || []).filter((d: any) => d.driver_type === 'cdi').map((d: any) => d.driver_data as Driver).filter(Boolean);
          const interimDriversCloud = (data || []).filter((d: any) => d.driver_type === 'interim').map((d: any) => d.driver_data as Driver).filter(Boolean);
          setDrivers(cdiDrivers);
          setInterimDrivers(interimDriversCloud);
          break;
        case 'charges':
          const cloudCharges = (data || []).map((c: any) => c.charge_data as FixedCharge).filter(Boolean);
          setCharges(cloudCharges);
          break;
        case 'trailers':
          const cloudTrailers = (data || []).map((t: any) => t.trailer_data as Trailer).filter(Boolean);
          setTrailers(cloudTrailers);
          break;
      }
      
      toast.success(`${section === 'vehicles' ? 'Véhicules' : section === 'drivers' ? 'Conducteurs' : section === 'charges' ? 'Charges' : 'Remorques'} rechargés (${data?.length || 0})`);
    } catch (error: any) {
      console.error(`[DataSync] Error reloading ${section}:`, error);
      syncDebug.logOperation(section, 'select', 0, false, error?.message);
      toast.error(`Erreur: ${error?.message || 'Échec du rechargement'}`);
    } finally {
      setIsReloadingSection(prev => ({ ...prev, [section]: false }));
    }
  }, [licenseId, setVehicles, setDrivers, setInterimDrivers, setCharges, setTrailers, syncDebug]);

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
    // Log realtime event to debug
    syncDebug.updateRealtimeStatus(table, 'SUBSCRIBED', true);
  }, [setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges, syncDebug]);

  // Subscribe to realtime changes for company data
  const realtimeChannel = useCompanyRealtimeSync({
    licenseId,
    onDataChange: handleRealtimeChange,
    enabled: !!licenseId,
  });
  
  // Update realtime status in debug when subscription changes
  useEffect(() => {
    if (realtimeChannel) {
      const tables = ['user_vehicles', 'user_drivers', 'user_charges', 'user_trailers', 'saved_tours', 'trips', 'clients', 'quotes', 'company_settings'];
      tables.forEach(table => {
        syncDebug.updateRealtimeStatus(table, 'SUBSCRIBED');
      });
    }
  }, [realtimeChannel, syncDebug]);

  // Load company-shared data on initial auth or when licenseId changes
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

      console.log('[DataSyncProvider] Loading company data for licenseId:', licenseId);
      const companyData = await loadCompanyData();
       if (companyData) {
         hasLoadedCompanyData.current = true;
         console.log('[DataSyncProvider] Loaded company data:', {
           vehicles: companyData.vehicles.length,
           drivers: companyData.drivers.length,
           charges: companyData.charges.length,
           trailers: companyData.trailers.length,
         });

         // Replace local data with company data for full sync.
         // IMPORTANT: also clear local data when the company source of truth is empty.
         const cloudVehicles = (companyData.vehicles || [])
           .map((v: any) => v.vehicle_data as Vehicle)
           .filter(Boolean);
         setVehicles(cloudVehicles);

         const cloudTrailers = (companyData.trailers || [])
           .map((t: any) => t.trailer_data as Trailer)
           .filter(Boolean);
         setTrailers(cloudTrailers);

         const cdiDrivers = (companyData.drivers || [])
           .filter((d: any) => d.driver_type === 'cdi')
           .map((d: any) => d.driver_data as Driver)
           .filter(Boolean);
         const interimDriversCloud = (companyData.drivers || [])
           .filter((d: any) => d.driver_type === 'interim')
           .map((d: any) => d.driver_data as Driver)
           .filter(Boolean);
         setDrivers(cdiDrivers);
         setInterimDrivers(interimDriversCloud);

         const cloudCharges = (companyData.charges || [])
           .map((c: any) => c.charge_data as FixedCharge)
           .filter(Boolean);
         setCharges(cloudCharges);
       }
    };

    loadSharedData();
  }, [licenseId, loadCompanyData, setVehicles, setTrailers, setDrivers, setInterimDrivers, setCharges]);

   const applyCompanyData = useCallback((companyData: any) => {
     if (!companyData) return;

     // Same rule as initial load: if the company truth source is empty,
     // we must clear local storage to converge across sessions.
     const cloudVehicles = (companyData.vehicles || [])
       .map((v: any) => v.vehicle_data as Vehicle)
       .filter(Boolean);
     setVehicles(cloudVehicles);

     const cloudTrailers = (companyData.trailers || [])
       .map((t: any) => t.trailer_data as Trailer)
       .filter(Boolean);
     setTrailers(cloudTrailers);

     const cdiDrivers = (companyData.drivers || [])
       .filter((d: any) => d.driver_type === 'cdi')
       .map((d: any) => d.driver_data as Driver)
       .filter(Boolean);
     const interimDriversCloud = (companyData.drivers || [])
       .filter((d: any) => d.driver_type === 'interim')
       .map((d: any) => d.driver_data as Driver)
       .filter(Boolean);
     setDrivers(cdiDrivers);
     setInterimDrivers(interimDriversCloud);

     const cloudCharges = (companyData.charges || [])
       .map((c: any) => c.charge_data as FixedCharge)
       .filter(Boolean);
     setCharges(cloudCharges);
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
      // Debug features
      isDebugMode: syncDebug.isDebugMode,
      toggleDebugMode: syncDebug.toggleDebugMode,
      debugOperations: syncDebug.operations,
      debugRealtimeStatus: syncDebug.realtimeStatus,
      debugLicenseId: licenseId,
      debugUserId: userId,
      clearDebugOperations: syncDebug.clearOperations,
      reloadSection,
      isReloadingSection,
    }}>
      {children}
    </DataSyncActionsContext.Provider>
  );
}
