import { useCallback } from 'react';
import { AccountantSpace, type DossierBuild } from '@/components/accounting/AccountantSpace';
import { useLicenseContext } from '@/context/LicenseContext';
import { useLicense } from '@/hooks/useLicense';
import { useClients } from '@/hooks/useClients';
import { useCloudCharges } from '@/hooks/useCloudCharges';
import { useFlowInvoices } from '@/hooks/useFlowInvoices';
import { monthBounds, payslipEntries, penaltyEntries, readme, safeName, toCsv } from '@/lib/accountingDossier';
import { buildFec, DEFAULT_FEC_ACCOUNTS, fecFileName, type FecAccounts } from '@/lib/fec';
import { fecRows, invoiceFacturXBytes } from '@/lib/invoiceFacturX';
import { computeInvoiceTotals, isCreditNote } from '@/lib/invoices';
import type { ZipEntry } from '@/lib/zip';

const PERIOD_LABEL: Record<string, string> = { daily: 'par jour', monthly: 'par mois', yearly: 'par an' };

/** Comptabilité › Expert-comptable : dossier du mois et accès du cabinet (OptiFlow). */
export default function Accountant() {
  const { licenseId } = useLicenseContext();
  const { licenseData } = useLicense();
  const inv = useFlowInvoices();
  const { clients } = useClients();
  const { charges } = useCloudCharges();
  const issuer = inv.issuer;
  const companyName = issuer.companyName || licenseData?.companyName || 'Votre société';

  const buildFiles = useCallback(async (period: string): Promise<DossierBuild> => {
    if (!licenseId) throw new Error('Licence introuvable');
    const { from, to } = monthBounds(period);
    const files: ZipEntry[] = [];
    const issued = inv.invoices.filter((i) => i.status !== 'draft' && i.issueDate >= from && i.issueDate <= to);
    for (const i of issued) {
      files.push({ name: `${isCreditNote(i) ? 'avoirs' : 'factures'}/${safeName(i.number)}.pdf`, data: await invoiceFacturXBytes(i, issuer) });
    }
    if (issued.length) {
      files.push({
        name: `factures/recapitulatif-factures-${period}.csv`,
        data: toCsv(['Numéro', 'Type', 'Date', 'Échéance', 'Client', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'], issued.map((i) => {
          const t = computeInvoiceTotals(i.lines, i.taxRate);
          return [i.number, isCreditNote(i) ? 'Avoir' : 'Facture', i.issueDate, i.dueDate, i.clientName, t.subtotal, t.tax, t.total, i.status, i.paidAt?.slice(0, 10) ?? ''];
        })),
      });
    }
    let accounts: Required<FecAccounts> = DEFAULT_FEC_ACCOUNTS;
    try { accounts = { ...DEFAULT_FEC_ACCOUNTS, ...JSON.parse(localStorage.getItem('optiflow-fec-accounts') || '{}') }; } catch { /* comptes par défaut */ }
    const fec = buildFec(fecRows(inv.invoices.filter((i) => i.status !== 'draft')), { from, to, accounts });
    if (fec.lines > 0) files.push({ name: fecFileName(issuer.siren || licenseData?.siren, to), data: fec.text });

    const employer = { name: companyName, address: licenseData?.address ?? null, postalCode: licenseData?.postalCode ?? null, city: licenseData?.city ?? null, siret: licenseData?.siren ?? null };
    const pay = await payslipEntries(licenseId, period, employer);
    files.push(...pay.entries);
    const pen = await penaltyEntries(licenseId, period, { clients: new Map(clients.map((c) => [c.id, c.name])) });
    files.push(...pen.entries);
    const list = charges.filter((c) => c.amount);
    if (list.length) {
      files.push({ name: `charges-fixes-${period}.csv`, data: toCsv(['Charge', 'Montant', 'HT/TTC', 'Fréquence'], list.map((c) => [c.name, Number(c.amount), c.isHT ? 'HT' : 'TTC', PERIOD_LABEL[c.periodicity] ?? c.periodicity])) });
    }
    const invCount = issued.filter((i) => !isCreditNote(i)).length;
    const creditCount = issued.length - invCount;
    const contents = [
      { label: invCount > 1 ? 'factures' : 'facture', count: invCount },
      { label: creditCount > 1 ? 'avoirs' : 'avoir', count: creditCount },
      { label: pay.count > 1 ? 'fiches de paie' : 'fiche de paie', count: pay.count },
      { label: pen.count > 1 ? 'pénalités' : 'pénalité', count: pen.count },
    ].filter((c) => c.count > 0);
    files.unshift(readme({
      app: 'OptiFlow',
      company: companyName,
      period,
      lines: [
        `${invCount} facture(s) et ${creditCount} avoir(s) Factur-X (dossiers factures/ et avoirs/), avec un récapitulatif CSV`,
        fec.lines > 0 ? 'FEC des ventes du mois' : 'Pas de FEC : aucune écriture de vente ce mois-ci',
        `${pay.count} fiche(s) de paie validée(s) (dossier fiches-de-paie/)`,
        pen.count ? `${pen.count} pénalité(s) : retenues des clients, retards de paiement, amendes (CSV)` : 'Aucune pénalité ce mois-ci',
        list.length ? 'Charges fixes déclarées (CSV)' : 'Aucune charge fixe déclarée',
      ],
    }));
    return { files, contents };
  }, [licenseId, inv.invoices, issuer, licenseData, companyName, clients, charges]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expert-comptable</h1>
        <p className="text-sm text-muted-foreground">Dossier comptable du mois et accès de votre cabinet</p>
      </div>
      <AccountantSpace licenseId={licenseId} companyName={companyName} appName="OptiFlow" buildFiles={buildFiles} />
    </div>
  );
}
