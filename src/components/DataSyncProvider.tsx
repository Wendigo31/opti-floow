import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDataSync } from '@/hooks/useDataSync';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { Driver } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Debounce interval in ms (sync every 30 seconds max, not on every change)
const SYNC_DEBOUNCE = 30000;

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { drivers, charges, setDrivers, setCharges } = useApp();
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>('optiflow_vehicles', []);
  const [trailers, setTrailers] = useLocalStorage<Trailer[]>('optiflow_trailers', []);
  const [interimDrivers, setInterimDrivers] = useLocalStorage<Driver[]>('optiflow_interim_drivers', []);
  const { syncAllData, loadCompanyData } = useDataSync();
  
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedCompanyData = useRef<boolean>(false);

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

        // Merge company data with local data (prefer cloud data for company sync)
        // Only merge if we have company data and it's different from local
        if (companyData.vehicles.length > 0) {
          const cloudVehicles = companyData.vehicles.map((v: any) => v.vehicle_data as Vehicle);
          // Merge: add cloud vehicles not present locally
          const localIds = vehicles.map(v => v.id);
          const newVehicles = cloudVehicles.filter(cv => cv && !localIds.includes(cv.id));
          if (newVehicles.length > 0) {
            setVehicles([...vehicles, ...newVehicles]);
          }
        }

        if (companyData.trailers.length > 0) {
          const cloudTrailers = companyData.trailers.map((t: any) => t.trailer_data as Trailer);
          // Merge: add cloud trailers not present locally
          const localIds = trailers.map(t => t.id);
          const newTrailers = cloudTrailers.filter(ct => ct && !localIds.includes(ct.id));
          if (newTrailers.length > 0) {
            setTrailers([...trailers, ...newTrailers]);
          }
        }

        if (companyData.drivers.length > 0) {
          const cdiDrivers = companyData.drivers
            .filter((d: any) => d.driver_type === 'cdi')
            .map((d: any) => d.driver_data as Driver);
          const interimDriversCloud = companyData.drivers
            .filter((d: any) => d.driver_type === 'interim')
            .map((d: any) => d.driver_data as Driver);

          // Merge CDI drivers
          const localCdiIds = drivers.map(d => d.id);
          const newCdiDrivers = cdiDrivers.filter(cd => cd && !localCdiIds.includes(cd.id));
          if (newCdiDrivers.length > 0) {
            setDrivers([...drivers, ...newCdiDrivers]);
          }

          // Merge interim drivers
          const localInterimIds = interimDrivers.map(d => d.id);
          const newInterimDrivers = interimDriversCloud.filter(id => id && !localInterimIds.includes(id.id));
          if (newInterimDrivers.length > 0) {
            setInterimDrivers([...interimDrivers, ...newInterimDrivers]);
          }
        }

        if (companyData.charges.length > 0) {
          const cloudCharges = companyData.charges.map((c: any) => c.charge_data);
          // Merge charges
          const localChargeIds = charges.map(c => c.id);
          const newCharges = cloudCharges.filter(cc => cc && !localChargeIds.includes(cc.id));
          if (newCharges.length > 0) {
            setCharges([...charges, ...newCharges]);
          }
        }
      }
    };

    loadSharedData();
  }, [loadCompanyData]); // Only run once on mount

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
        
        // Sync immediately on sign in
        lastSyncRef.current = Date.now();
        await syncAllData(vehicles, drivers, interimDrivers, charges, trailers);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [vehicles, drivers, interimDrivers, charges, trailers, syncAllData]);

  return <>{children}</>;
}
