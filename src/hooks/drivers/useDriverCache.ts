import { useState, useCallback } from 'react';
import type { Driver } from '@/types';

const CACHE_KEY_CDI = 'optiflow_drivers_cache';
const CACHE_KEY_INTERIM = 'optiflow_interim_drivers_cache';
const CACHE_KEY_CDD = 'optiflow_cdd_drivers_cache';
const CACHE_KEY_AUTRE = 'optiflow_autre_drivers_cache';

export interface DriverCache {
  cdi: Driver[];
  cdd: Driver[];
  interim: Driver[];
  autre: Driver[];
}

export function useDriverCache() {
  // Load from localStorage on init
  const [cache, setCache] = useState<DriverCache>(() => ({
    cdi: getCachedDrivers(CACHE_KEY_CDI),
    cdd: getCachedDrivers(CACHE_KEY_CDD),
    interim: getCachedDrivers(CACHE_KEY_INTERIM),
    autre: getCachedDrivers(CACHE_KEY_AUTRE),
  }));

  const persist = useCallback((cdi: Driver[], cdd: Driver[], interim: Driver[], autre?: Driver[]) => {
    try {
      localStorage.setItem(CACHE_KEY_CDI, JSON.stringify(cdi));
      localStorage.setItem(CACHE_KEY_CDD, JSON.stringify(cdd));
      localStorage.setItem(CACHE_KEY_INTERIM, JSON.stringify(interim));
      if (autre) localStorage.setItem(CACHE_KEY_AUTRE, JSON.stringify(autre));
      setCache({ cdi, cdd, interim, autre: autre || [] });
    } catch (e) {
      console.error('Failed to cache drivers:', e);
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(CACHE_KEY_CDI);
    localStorage.removeItem(CACHE_KEY_CDD);
    localStorage.removeItem(CACHE_KEY_INTERIM);
    localStorage.removeItem(CACHE_KEY_AUTRE);
    setCache({ cdi: [], cdd: [], interim: [], autre: [] });
  }, []);

  return { cache, persist, clear };
}

function getCachedDrivers(key: string): Driver[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
