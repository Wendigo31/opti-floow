import { useMemo } from 'react';
import { PenaltiesPanel } from '@/components/penalties/PenaltiesPanel';
import { useLicenseContext } from '@/context/LicenseContext';
import { useLicense } from '@/hooks/useLicense';
import { useClients } from '@/hooks/useClients';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useTrips } from '@/hooks/useTrips';
import { useFlowInvoices } from '@/hooks/useFlowInvoices';
import { amountDueTTC, computeInvoiceTotals, isCreditNote } from '@/lib/invoices';
import type { LateInvoice } from '@/lib/penalties';

const fr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Comptabilité › Pénalités : retenues des clients, retards de paiement, amendes et PV (même écran que les autres logiciels). */
export default function Penalties() {
  const { licenseId } = useLicenseContext();
  const { licenseData } = useLicense();
  const { clients } = useClients();
  const { vehicles } = useCloudVehicles();
  const { trips } = useTrips();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const inv = useFlowInvoices();

  const drivers = useMemo(() => {
    const all = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];
    return all.filter((d, i) => all.findIndex((x) => x.id === d.id) === i).map((d) => ({ id: d.id, name: d.name }));
  }, [cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers]);

  const clientName = (id?: string | null) => clients.find((c) => c.id === id)?.name ?? '';

  const lateSource = useMemo<LateInvoice[]>(
    () =>
      inv.invoices
        .filter((i) => !isCreditNote(i) && (i.status === 'sent' || i.status === 'paid') && i.dueDate)
        .map((i) => ({
          id: i.id,
          number: i.number,
          clientId: i.clientId || null,
          clientName: i.clientName,
          dueDate: i.dueDate,
          amountTTC: i.status === 'paid' ? computeInvoiceTotals(i.lines, i.taxRate).total : amountDueTTC(i, inv.invoices),
          paidAt: i.status === 'paid' ? i.paidAt ?? null : null,
        })),
    [inv.invoices],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pénalités</h1>
        <p className="text-sm text-muted-foreground">Retenues des clients, retards de paiement, amendes et PV</p>
      </div>
      <PenaltiesPanel
        licenseId={licenseId}
        company={{ name: inv.issuer.companyName || licenseData?.companyName || 'Votre société', address: [inv.issuer.addressStreet, inv.issuer.addressPostalCode, inv.issuer.addressCity].filter(Boolean).join(' ') || null, siren: inv.issuer.siren || licenseData?.siren || null, email: inv.issuer.email || null }}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        drivers={drivers}
        vehicles={vehicles.map((v) => ({ id: v.id, name: [v.name, v.licensePlate].filter(Boolean).join(' – ') }))}
        works={trips.slice(0, 300).map((t) => ({ id: t.id, name: `${fr(t.trip_date)} · ${clientName(t.client_id) || t.destination_address}` }))}
        workLabel="Trajet"
        invoices={lateSource}
      />
    </div>
  );
}
