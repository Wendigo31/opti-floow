import { useEffect, useState } from 'react';
import { getSettings } from '@/components/opti-settings/optiSettingsApi';

/** Taux de TVA par défaut de la société (Paramètres › Général), 20 % tant qu'il n'est pas chargé. */
export function useCompanyVatRate(fallback = 20): number {
  const [rate, setRate] = useState(fallback);
  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => alive && setRate(Number(s.vat_rate)))
      .catch(() => { /* hors ligne : taux par défaut */ });
    return () => {
      alive = false;
    };
  }, []);
  return rate;
}
