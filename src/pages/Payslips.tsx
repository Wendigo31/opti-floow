import { useEffect, useState } from 'react';
import { PayslipsPanel } from '@/components/payslips/PayslipsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseContext } from '@/context/LicenseContext';
import { useTeam } from '@/hooks/useTeam';

/**
 * Fiches de paie : même écran qu'OptiFret (demande nov. 2026). Un bulletin par conducteur et par
 * mois, brouillon → validé → PDF. Accessible depuis RH et Comptabilité.
 */
export default function Payslips() {
  const { licenseId } = useLicenseContext();
  const { licenseData } = useLicense();
  const { currentUserInfo } = useTeam();
  // Intérimaires : payés par leur agence, pas de bulletin chez nous.
  const { cdiDrivers, cddDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...cddDrivers, ...autreDrivers, ...jokerDrivers];
  const unique = drivers.filter((d, i) => drivers.findIndex((x) => x.id === d.id) === i);
  // Jours pointés dans l'appli OptiFlow Conducteur (aide à la saisie des repas et des heures).
  const [worked, setWorked] = useState<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    if (!licenseId) return;
    const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
    void (supabase as unknown as { from: (t: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('driver_time_entries').select('driver_id, work_date').eq('license_id', licenseId).eq('kind', 'start').gte('work_date', since)
      .then(({ data }: { data: { driver_id: string; work_date: string }[] | null }) => {
        const m = new Map<string, Set<string>>();
        for (const r of data ?? []) { if (!m.has(r.driver_id)) m.set(r.driver_id, new Set()); m.get(r.driver_id)!.add(r.work_date); }
        setWorked(m);
      });
  }, [licenseId]);
  return (
    <PayslipsPanel
      licenseId={licenseId}
      currentUser={currentUserInfo?.email ?? null}
      workedDaysOf={(driverId, month) => [...(worked.get(driverId) ?? [])].filter((d) => d.startsWith(month)).length}
      drivers={unique.map((d) => ({
        id: d.id,
        name: d.name,
        // Heures hebdomadaires du contrat, déduites des heures par jour et des jours par mois.
        weekly_hours: d.hoursPerDay && d.workingDaysPerMonth ? Math.round(((d.hoursPerDay * d.workingDaysPerMonth * 12) / 52) * 100) / 100 : null,
        base_salary: d.baseSalary || null,
      }))}
      employer={{
        name: licenseData?.companyName || 'Employeur',
        address: licenseData?.address ?? null,
        postalCode: licenseData?.postalCode ?? null,
        city: licenseData?.city ?? null,
        siret: licenseData?.siren ?? null,
      }}
    />
  );
}
