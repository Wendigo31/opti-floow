import { useMemo } from 'react';
import { TachoRecordsPanel, type TachoDriver } from '@/components/tachograph/TachoRecordsPanel';
import { useLicenseContext } from '@/context/LicenseContext';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useTeam } from '@/hooks/useTeam';
import type { DriverCategory } from '@/lib/driverContract';

/** RH › Relevés tachy : relevés journaliers et mensuels des cartes conducteur. */
export default function Tachograph() {
  const { licenseId } = useLicenseContext();
  const { currentUserRole } = useTeam();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const list: TachoDriver[] = useMemo(() => {
    const all = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];
    return all.filter((d, i) => all.findIndex((x) => x.id === d.id) === i).map((d) => {
      const weekly = d.hoursPerDay && d.workingDaysPerMonth ? (d.hoursPerDay * d.workingDaysPerMonth * 12) / 52 : 35;
      const category = (d.ccnCategory as DriverCategory | undefined) ?? (weekly >= 42.5 ? 'longue_distance' : weekly >= 38.5 ? 'courte_distance' : 'messagerie');
      return { id: d.id, name: d.name, category };
    });
  }, [cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers]);
  return <TachoRecordsPanel licenseId={licenseId} drivers={list} canEdit={currentUserRole === 'direction' || currentUserRole === 'rh'} />;
}
