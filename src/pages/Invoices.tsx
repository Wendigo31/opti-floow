import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle, Clock, Download, FileDown, FileMinus, FileText, Mail, Pencil, Plus, Send, Stamp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFlowInvoices, type FlowInvoice } from '@/hooks/useFlowInvoices';
import { FlowInvoiceDialog } from '@/components/invoicing/FlowInvoiceDialog';
import { IssuerCard } from '@/components/invoicing/IssuerCard';
import { FuelIndexCard } from '@/components/invoicing/FuelIndexCard';
import { CreditNoteDialog } from '@/components/invoices/CreditNoteDialog';
import { FecExportDialog } from '@/components/invoicing/FecExportDialog';
import { amountDueTTC, computeInvoiceTotals, creditableHT, formatDateFr, formatEuro } from '@/lib/invoices';
import { downloadBytes } from '@/lib/facturx';
import { invoiceFacturXBytes } from '@/lib/invoiceFacturX';
import { downloadInvoicePdf } from '@/lib/invoicePdf';

type View = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled' | 'credit';
const LABEL: Record<View, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'À encaisser', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  overdue: { label: 'En retard', className: 'bg-destructive/15 text-destructive' },
  paid: { label: 'Payée', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  cancelled: { label: 'Annulée', className: 'bg-muted text-muted-foreground line-through' },
  credit: { label: 'Avoir', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
};
const today = () => new Date().toISOString().slice(0, 10);
const viewOf = (i: FlowInvoice): View =>
  i.kind === 'credit_note' ? 'credit' : i.status === 'sent' && i.dueDate && i.dueDate < today() ? 'overdue' : i.status;

/**
 * Factures OptiFlow (espace Comptabilité) : facture mensuelle par donneur
 * d'ordre à partir des tournées, émission numérotée, PDF Factur-X, relances,
 * avoirs et export comptable FEC.
 */
export default function Invoices() {
  const inv = useFlowInvoices();
  const [tab, setTab] = useState('invoices');
  const [editing, setEditing] = useState<FlowInvoice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [creditFor, setCreditFor] = useState<FlowInvoice | null>(null);
  const [fecOpen, setFecOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | View>('all');
  const [search, setSearch] = useState('');

  const usedKeys = useMemo(
    () => new Set(inv.invoices.filter((i) => i.status !== 'cancelled' && i.kind !== 'credit_note' && i.id !== editing?.id).flatMap((i) => i.lines.map((l) => l.sourceRouteId).filter(Boolean) as string[])),
    [inv.invoices, editing],
  );
  const totals = useMemo(() => {
    const live = inv.invoices.filter((i) => i.kind !== 'credit_note' && i.status !== 'cancelled' && i.status !== 'draft');
    const due = (list: FlowInvoice[]) => list.reduce((s, i) => s + amountDueTTC(i, inv.invoices), 0);
    return {
      pending: due(live.filter((i) => i.status === 'sent')),
      overdue: due(live.filter((i) => viewOf(i) === 'overdue')),
      paid: due(live.filter((i) => i.status === 'paid')),
      drafts: inv.invoices.filter((i) => i.status === 'draft').length,
    };
  }, [inv.invoices]);

  const rows = inv.invoices.filter((i) => {
    if (filter !== 'all' && viewOf(i) !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || [i.number, i.clientName].some((v) => v?.toLowerCase().includes(q));
  });

  const ensureIssuer = () => {
    if (!inv.issuer.companyName) {
      toast.error('Renseignez d\'abord votre société (onglet « Ma société »)');
      setTab('issuer');
      return false;
    }
    return true;
  };
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const pdf = async (i: FlowInvoice) => {
    if (!ensureIssuer()) return;
    const name = `${i.kind === 'credit_note' ? 'avoir' : 'facture'}-${i.number || 'brouillon'}.pdf`;
    try {
      downloadBytes(await invoiceFacturXBytes(i, inv.issuer), name, 'application/pdf');
    } catch {
      downloadInvoicePdf(i, inv.issuer);
    }
  };
  const mail = async (i: FlowInvoice, kind: 'invoice' | 'reminder') => {
    if (!ensureIssuer()) return;
    const isCredit = i.kind === 'credit_note';
    const t = computeInvoiceTotals(i.lines, i.taxRate);
    const subject = isCredit ? `Avoir ${i.number}` : kind === 'invoice' ? `Facture ${i.number}` : `Relance — facture ${i.number}`;
    const body = kind === 'reminder'
      ? `Bonjour,\n\nSauf erreur de notre part, la facture ${i.number} de ${formatEuro(amountDueTTC(i, inv.invoices))} TTC, échue le ${formatDateFr(i.dueDate)}, reste impayée. Merci de procéder à son règlement.\n\nCordialement,\n${inv.issuer.companyName}`
      : `Bonjour,\n\nVeuillez trouver ci-joint ${isCredit ? "l'avoir" : 'la facture'} ${i.number} de ${formatEuro(Math.abs(t.total))} TTC${i.periodStart ? ` (période du ${formatDateFr(i.periodStart)} au ${formatDateFr(i.periodEnd)})` : ''}.${isCredit ? '' : `\nÉchéance : ${formatDateFr(i.dueDate)}.`}\n\nCordialement,\n${inv.issuer.companyName}`;
    await pdf(i);
    window.open(`mailto:${encodeURIComponent(i.clientEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    await run(() => (kind === 'invoice' ? inv.markSent(i.id) : inv.markReminded(i)));
  };

  const card = (label: string, value: string, Icon: typeof Clock, tone: string) => (
    <Card key={label}>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${tone}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Factures</h1>
          <p className="text-sm text-muted-foreground">Facture mensuelle par donneur d'ordre, à partir des tournées réalisées</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setFecOpen(true)}><FileDown className="h-4 w-4" /> Export comptable (FEC)</Button>
          <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Nouvelle facture</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {card('À encaisser', formatEuro(totals.pending), Clock, 'text-sky-600')}
        {card('En retard', formatEuro(totals.overdue), AlertTriangle, 'text-destructive')}
        {card('Encaissé', formatEuro(totals.paid), CheckCircle, 'text-emerald-600')}
        {card('Brouillons', String(totals.drafts), FileText, 'text-muted-foreground')}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="issuer">Ma société</TabsTrigger>
        </TabsList>

        <TabsContent value="issuer" className="space-y-6">
          <IssuerCard issuer={inv.issuer} onSave={(issuer) => void run(() => inv.saveSettings({ issuer }))} />
          <FuelIndexCard value={inv.fuel} onSave={(fuel) => void run(() => inv.saveSettings({ fuel }))} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Rechercher un numéro ou un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="sm:w-48" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {(Object.keys(LABEL) as View[]).map((v) => <SelectItem key={v} value={v}>{LABEL[v].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Période</TableHead>
                    <TableHead className="hidden sm:table-cell">Échéance</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.loading ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Chargement…</TableCell></TableRow>
                  ) : !rows.length ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{inv.error ? inv.error.message : 'Aucune facture. Créez la facture du mois d\'un client à partir de ses tournées.'}</TableCell></TableRow>
                  ) : rows.map((i) => {
                    const v = viewOf(i);
                    const t = computeInvoiceTotals(i.lines, i.taxRate);
                    const credited = inv.invoices.some((c) => c.creditOf?.id === i.id);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">
                          {i.number || <span className="font-sans text-muted-foreground">Brouillon</span>}
                          {i.creditOf && <span className="block font-sans text-[11px] text-muted-foreground">sur {i.creditOf.number}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{i.clientName || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{i.periodStart ? `${formatDateFr(i.periodStart)} – ${formatDateFr(i.periodEnd)}` : '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{i.status === 'draft' ? '—' : formatDateFr(i.dueDate)}</TableCell>
                        <TableCell className={`text-right font-semibold ${v === 'cancelled' ? 'text-muted-foreground line-through' : ''}`}>
                          {formatEuro(t.total)}
                          {credited && v !== 'cancelled' && <span className="block text-[11px] font-normal text-muted-foreground">reste {formatEuro(amountDueTTC(i, inv.invoices))}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={LABEL[v].className}>{LABEL[v].label}</Badge>
                          {i.reminderCount > 0 && <span className="block text-[11px] text-muted-foreground">{i.reminderCount} relance(s)</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            {i.status === 'draft' ? (
                              <>
                                <Button size="icon" variant="ghost" title="Modifier" aria-label="Modifier le brouillon" onClick={() => { setEditing(i); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="gap-1" onClick={() => ensureIssuer() && void run(() => inv.issue(i.id), 'Facture émise et numérotée')}><Stamp className="h-4 w-4" /> Émettre</Button>
                                <Button size="icon" variant="ghost" title="Supprimer" aria-label="Supprimer le brouillon" onClick={() => window.confirm('Supprimer ce brouillon ?') && void run(() => inv.deleteDraft(i.id), 'Brouillon supprimé')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" title="PDF (Factur-X)" aria-label={`PDF de ${i.number}`} onClick={() => void pdf(i)}><Download className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" title="Envoyer par e-mail" aria-label={`Envoyer ${i.number}`} onClick={() => void mail(i, 'invoice')}><Mail className="h-4 w-4" /></Button>
                                {(v === 'sent' || v === 'overdue') && (
                                  <>
                                    <Button size="icon" variant="ghost" title="Relancer" aria-label={`Relancer ${i.number}`} onClick={() => void mail(i, 'reminder')}><BellRing className={`h-4 w-4 ${v === 'overdue' ? 'text-destructive' : ''}`} /></Button>
                                    <Button size="sm" variant="ghost" className="gap-1 text-emerald-600" onClick={() => void run(() => inv.setStatus(i.id, 'paid'), 'Facture marquée payée')}><CheckCircle className="h-4 w-4" /> Payée</Button>
                                  </>
                                )}
                                {i.kind === 'invoice' && i.status !== 'cancelled' && (
                                  <Button size="icon" variant="ghost" title="Créer un avoir" aria-label={`Créer un avoir sur ${i.number}`} onClick={() => setCreditFor(i)}><FileMinus className="h-4 w-4 text-amber-600" /></Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Send className="h-3.5 w-3.5" /> « Envoyer » télécharge le PDF Factur-X et ouvre votre messagerie : joignez-le au message.</p>
        </TabsContent>
      </Tabs>

      <FlowInvoiceDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        invoice={editing}
        fuel={inv.fuel}
        usedKeys={usedKeys}
        defaultTerms={inv.issuer.paymentTermsDays || 30}
        onSave={async (d) => {
          await inv.saveDraft(d);
          toast.success('Brouillon enregistré');
        }}
      />
      {creditFor && (
        <CreditNoteDialog
          invoiceNumber={creditFor.number}
          leftHT={creditableHT(creditFor, inv.invoices)}
          open={!!creditFor}
          onOpenChange={(o) => !o && setCreditFor(null)}
          rebillHint="la facture passe « annulée » et ses tournées peuvent être refacturées."
          onConfirm={async (reason, amountHT) => {
            try {
              const cn = await inv.creditNote(creditFor.id, reason, amountHT);
              toast.success(`Avoir ${cn?.number ?? ''} créé`);
            } catch (e) {
              toast.error((e as Error).message);
              throw e;
            }
          }}
        />
      )}
      <FecExportDialog open={fecOpen} onOpenChange={setFecOpen} invoices={inv.invoices.filter((i) => i.status !== 'draft')} siren={inv.issuer.siren} />
    </div>
  );
}
