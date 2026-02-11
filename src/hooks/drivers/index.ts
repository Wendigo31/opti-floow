import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Driver } from '@/types';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';
import { useDriverCache } from './useDriverCache';
import { useDriverCRUD } from './useDriverCRUD';
import { useDriverRealtime } from './useDriverRealtime';

export function useCloudDrivers() {
  const { licenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
  const { cache, persist: persistCache, clear: clearCache } = useDriverCache();
  const { createDriver: createCRUD, createBatch: createBatchCRUD, updateDriver: updateCRUD, deleteDriver: deleteCRUD } = useDriverCRUD();

  const [cdiDrivers, setCdiDrivers] = useState<Driver[]>(() => cache.cdi);
  const [cddDrivers, setCddDrivers] = useState<Driver[]>(() => cache.cdd);
  const [interimDrivers, setInterimDrivers] = useState<Driver[]>(() => cache.interim);
  const [autreDrivers, setAutreDrivers] = useState<Driver[]>(() => cache.autre || []);
  const [loading, setLoading] = useState(false);

  const fetchInProgressRef = useRef(false);
  const authUserIdRef = useRef<string | null>(authUserId);
  const licenseIdRef = useRef<string | null>(licenseId);

  useEffect(() => { authUserIdRef.current = authUserId; }, [authUserId]);
  useEffect(() => { licenseIdRef.current = licenseId; }, [licenseId]);

  const fetchDrivers = useCallback(async (): Promise<void> => {
    if (fetchInProgressRef.current) return;

    let lid = licenseIdRef.current || licenseId;
    let uid = authUserIdRef.current || authUserId;

    if (!lid || !uid) {
      try {
        const fallbackLid = await getLicenseId();
        const { data: { user } } = await supabase.auth.getUser();
        lid = fallbackLid;
        uid = user?.id || null;
      } catch (e) {
        console.warn('[useCloudDrivers] fetchDrivers fallback failed:', e);
      }
    }

    if (!lid || !uid) {
      setCdiDrivers(cache.cdi);
      setCddDrivers(cache.cdd);
      setInterimDrivers(cache.interim);
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_drivers')
        .select('driver_data, driver_type')
        .eq('license_id', lid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cdi: Driver[] = [];
      const cdd: Driver[] = [];
      const interim: Driver[] = [];
      const autre: Driver[] = [];

      (data || []).forEach(row => {
        const driverData = row.driver_data as unknown as Driver;
        if (driverData) {
          if (row.driver_type === 'interim') {
            interim.push(driverData);
          } else if (row.driver_type === 'cdd') {
            cdd.push(driverData);
          } else if (row.driver_type === 'autre') {
            autre.push(driverData);
          } else {
            cdi.push(driverData);
          }
        }
      });

      setCdiDrivers(cdi);
      setCddDrivers(cdd);
      setInterimDrivers(interim);
      setAutreDrivers(autre);
      persistCache(cdi, cdd, interim);
    } catch (error) {
      console.error('[useCloudDrivers] fetchDrivers error:', error);
      // Fallback to cache on error
      setCdiDrivers(cache.cdi);
      setCddDrivers(cache.cdd);
      setInterimDrivers(cache.interim);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [licenseId, authUserId, cache, persistCache]);

  const fetchDriversRef = useRef(fetchDrivers);
  useEffect(() => { fetchDriversRef.current = fetchDrivers; }, [fetchDrivers]);

  // Realtime subscription
  useDriverRealtime(licenseId, {
    onCdiUpdate: setCdiDrivers,
    onCddUpdate: setCddDrivers,
    onInterimUpdate: setInterimDrivers,
    onFetch: () => void fetchDriversRef.current(),
  });

  // Auto-fetch on license ready
  useEffect(() => {
    if (licenseId && authUserId) {
      fetchDrivers();
    }
  }, [licenseId, authUserId, fetchDrivers]);

  const createDriver = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim' | 'autre' = 'cdi',
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    const uid = authUserIdRef.current || authUserId;
    const lid = licenseIdRef.current || licenseId;

    if (!uid || !lid) {
      try {
        const fallbackLid = await getLicenseId();
        const { data: { user } } = await supabase.auth.getUser();
        if (fallbackLid && user) {
          return await createCRUD(driver, driverType, user.id, fallbackLid, options);
        }
      } catch (e) {
        console.warn('[useCloudDrivers] createDriver fallback failed:', e);
      }
      return false;
    }

    return createCRUD(driver, driverType, uid, lid, options);
  }, [authUserId, licenseId, createCRUD]);

  const createDriversBatch = useCallback(async (
    drivers: { driver: Driver; type: 'cdi' | 'cdd' | 'interim' | 'autre' }[],
    onProgress?: (done: number, total: number) => void
  ): Promise<number> => {
    const uid = authUserIdRef.current || authUserId;
    const lid = licenseIdRef.current || licenseId;

    if (!uid || !lid) {
      const fallbackLid = await getLicenseId();
      const { data: { user } } = await supabase.auth.getUser();
      if (!fallbackLid || !user) return 0;
      return createBatchCRUD(drivers, user.id, fallbackLid, onProgress);
    }

    return createBatchCRUD(drivers, uid, lid, onProgress);
  }, [authUserId, licenseId, createBatchCRUD]);

  const updateDriver = useCallback(async (
    driver: Driver,
    driverType: 'cdi' | 'cdd' | 'interim' | 'autre' = 'cdi'
  ): Promise<boolean> => {
    return updateCRUD(driver, driverType);
  }, [updateCRUD]);

  const deleteDriver = useCallback(async (
    id: string,
    driverType: 'cdi' | 'cdd' | 'interim' | 'autre' = 'cdi'
  ): Promise<boolean> => {
    const uid = authUserIdRef.current || authUserId;
    const lid = licenseIdRef.current || licenseId;

    if (!uid || !lid) {
      const { data: { user } } = await supabase.auth.getUser();
      const fallbackLid = await getLicenseId();
      if (!user || !fallbackLid) {
        return false;
      }
      return deleteCRUD(id, user.id, fallbackLid);
    }

    return deleteCRUD(id, uid, lid);
  }, [authUserId, licenseId, deleteCRUD]);

  return {
    cdiDrivers,
    cddDrivers,
    interimDrivers,
    autreDrivers,
    loading,
    fetchDrivers,
    createDriver,
    createDriversBatch,
    updateDriver,
    deleteDriver,
    setCdiDrivers,
    setInterimDrivers,
    setAutreDrivers,
  };
}
