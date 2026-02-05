 import { useEffect, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useLicenseContext } from '@/context/LicenseContext';
 
 // Cache keys for localStorage
 const CACHE_KEYS = {
   clients: 'optiflow_clients_prefetch',
   drivers: 'optiflow_drivers_prefetch',
   charges: 'optiflow_charges_prefetch',
   vehicles: 'optiflow_vehicles_prefetch',
   lastFetch: 'optiflow_prefetch_timestamp',
 };
 
 const STALE_TIME = 30 * 1000; // 30 seconds - data is considered fresh
 
 interface PrefetchResult {
   clients: any[];
   drivers: any[];
   charges: any[];
   vehicles: any[];
   timestamp: number;
 }
 
 // Check if cached data is still fresh
 function isCacheFresh(): boolean {
   try {
     const timestamp = localStorage.getItem(CACHE_KEYS.lastFetch);
     if (!timestamp) return false;
     return Date.now() - parseInt(timestamp, 10) < STALE_TIME;
   } catch {
     return false;
   }
 }
 
 // Prefetch all data in parallel
 async function prefetchAllData(licenseId: string): Promise<PrefetchResult> {
   const startTime = performance.now();
   console.log('[Prefetch] Starting parallel data fetch...');
   
   const [clientsRes, driversRes, chargesRes, vehiclesRes] = await Promise.all([
     supabase
       .from('clients')
       .select('*')
       .eq('license_id', licenseId)
       .order('created_at', { ascending: false }),
     supabase
       .from('user_drivers')
       .select('driver_data, driver_type')
       .eq('license_id', licenseId)
       .order('created_at', { ascending: false }),
     supabase
       .from('user_charges')
       .select('charge_data')
       .eq('license_id', licenseId)
       .order('created_at', { ascending: false }),
     supabase
       .from('user_vehicles')
       .select('vehicle_data')
       .eq('license_id', licenseId)
       .order('created_at', { ascending: false }),
   ]);
   
   const elapsed = Math.round(performance.now() - startTime);
   console.log(`[Prefetch] Completed in ${elapsed}ms`);
   
   const result: PrefetchResult = {
     clients: clientsRes.data || [],
     drivers: driversRes.data || [],
     charges: chargesRes.data || [],
     vehicles: vehiclesRes.data || [],
     timestamp: Date.now(),
   };
   
   // Cache the results
   try {
     localStorage.setItem(CACHE_KEYS.clients, JSON.stringify(result.clients));
     localStorage.setItem(CACHE_KEYS.drivers, JSON.stringify(result.drivers));
     localStorage.setItem(CACHE_KEYS.charges, JSON.stringify(result.charges));
     localStorage.setItem(CACHE_KEYS.vehicles, JSON.stringify(result.vehicles));
     localStorage.setItem(CACHE_KEYS.lastFetch, result.timestamp.toString());
   } catch (e) {
     console.warn('[Prefetch] Failed to cache data:', e);
   }
   
   return result;
 }
 
 /**
  * Hook that prefetches all company data in parallel on mount.
  * This reduces the perceived loading time by fetching everything at once
  * instead of waiting for each page to load its own data.
  */
 export function useDataPrefetch() {
   const { licenseId, authUserId, isLoading: licenseLoading } = useLicenseContext();
   const hasPrefetchedRef = useRef(false);
   
   useEffect(() => {
     // Only prefetch once per session
     if (hasPrefetchedRef.current) return;
     if (licenseLoading) return;
     if (!licenseId || !authUserId) return;
     
     // Skip if cache is still fresh
     if (isCacheFresh()) {
       console.log('[Prefetch] Using cached data (still fresh)');
       hasPrefetchedRef.current = true;
       return;
     }
     
     hasPrefetchedRef.current = true;
     
     // Fire and forget - don't block the UI
     void prefetchAllData(licenseId);
   }, [licenseId, authUserId, licenseLoading]);
 }
 
 // Export for manual refresh
 export { prefetchAllData };