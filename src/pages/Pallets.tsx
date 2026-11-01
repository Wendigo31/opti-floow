import { PalletsPanel } from '@/components/pallets/PalletsPanel';
import { useClients } from '@/hooks/useClients';
import { useLicenseContext } from '@/context/LicenseContext';

/** Palettes échangées avec les donneurs d'ordre (Exploitation). */
export default function Pallets() {
  const { licenseId } = useLicenseContext();
  const { clients } = useClients();
  return <PalletsPanel licenseId={licenseId} clients={clients.map((c) => ({ id: c.id, name: c.company || c.name }))} />;
}
