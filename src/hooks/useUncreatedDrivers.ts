import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'optiflow_uncreated_drivers';

export interface UncreatedDriver {
  name: string;
  source: string; // e.g. "Import planning"
  detectedAt: string; // ISO date
}

function getStored(): UncreatedDriver[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setStored(drivers: UncreatedDriver[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
}

export function useUncreatedDrivers() {
  const [uncreatedDrivers, setUncreatedDrivers] = useState<UncreatedDriver[]>(getStored);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setUncreatedDrivers(getStored());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addUncreatedDrivers = useCallback((names: string[], source = 'Import planning') => {
    setUncreatedDrivers(prev => {
      const existingNames = new Set(prev.map(d => d.name.toLowerCase().trim()));
      const now = new Date().toISOString();
      const newOnes = names
        .filter(n => n.trim() && !existingNames.has(n.toLowerCase().trim()))
        .map(name => ({ name: name.trim(), source, detectedAt: now }));
      const updated = [...prev, ...newOnes];
      setStored(updated);
      return updated;
    });
  }, []);

  const removeUncreatedDriver = useCallback((name: string) => {
    setUncreatedDrivers(prev => {
      const updated = prev.filter(d => d.name.toLowerCase() !== name.toLowerCase());
      setStored(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setUncreatedDrivers([]);
    setStored([]);
  }, []);

  return { uncreatedDrivers, addUncreatedDrivers, removeUncreatedDriver, clearAll };
}
