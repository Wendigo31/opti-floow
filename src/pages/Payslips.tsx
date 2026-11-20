import { PayslipsPanel } from '@/components/payslips/PayslipsPanel';
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
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];
  const unique = drivers.filter((d, i) => drivers.findIndex((x) => x.id === d.id) === i);
  return (
    <PayslipsPanel
      licenseId={licenseId}
      currentUser={currentUserInfo?.email ?? null}
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
