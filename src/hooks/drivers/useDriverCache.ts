import { useState, useCallback } from 'react';
import type { Driver } from '@/types';

const CACHE_KEY_CDI = 'optiflow_drivers_cache';
const CACHE_KEY_INTERIM = 'optiflow_interim_drivers_cache';
const CACHE_KEY_CDD = 'optiflow_cdd_drivers_cache';

export interface DriverCache {
  cdi: Driver[];
  cdd: Driver[];
  interim: Driver[];
}

export function useDriverCache() {
  // Load from localStorage on init
  const [cache, setCache] = useState<DriverCache>(() => ({
    cdi: getCachedCdiDrivers(),
    cdd: getCachedCddDrivers(),
    interim: getCachedInterimDrivers(),
  }));

  const persist = useCallback((cdi: Driver[], cdd: Driver[], interim: Driver[]) => {
    try {
      localStorage.setItem(CACHE_KEY_CDI, JSON.stringify(cdi));
      localStorage.setItem(CACHE_KEY_CDD, JSON.stringify(cdd));
      localStorage.setItem(CACHE_KEY_INTERIM, JSON.stringify(interim));
      setCache({ cdi, cdd, interim });
    } catch (e) {
      console.error('Failed to cache drivers:', e);
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(CACHE_KEY_CDI);
    localStorage.removeItem(CACHE_KEY_CDD);
    localStorage.removeItem(CACHE_KEY_INTERIM);
    setCache({ cdi: [], cdd: [], interim: [] });
  }, []);

  return { cache, persist, clear };
}

function getCachedCdiDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_CDI) || '[]');
  } catch {
    return [];
  }
}

function getCachedCddDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_CDD) || '[]');
  } catch {
    return [];
  }
}

function getCachedInterimDrivers(): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY_INTERIM) || '[]');
  } catch {
    return [];
  }
}
