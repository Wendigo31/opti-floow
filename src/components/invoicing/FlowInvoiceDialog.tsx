import { useEffect, useMemo, useState } from 'react';
import { Fuel, Loader2, Plus, Save, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/hooks/useClients';
import { useBillableWork } from '@/hooks/useBillableWork';
import { useRateCards } from '@/hooks/useRateCards';
import { useLicenseContext } from '@/context/LicenseContext';
import { computeInvoiceTotals, formatEuro, generateId, lineTotal, type InvoiceLine } from '@/lib/invoices';
import { withFuelLine, type FuelIndexSettings } from '@/lib/fuelIndex';
import type { FlowInvoice, InvoiceDraft } from '@/hooks/useFlowInvoices';

const STATUS_LABEL: Record<string, string> = { completed: 'réalisée', in_progress: 'en cours', planned: 'planifiée' };

function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}` };
}

/**
 * Facture mensuelle d'un donneur d'ordre : on choisit le client et le mois, on
 * coche les tournées réalisées (prix de la grille tarifaire, sinon de la tournée),
 * puis on ajuste les lignes. Les tournées déjà facturées ne sont pas reproposées.
 */
export function FlowInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  fuel,
  usedKeys,
  defaultTerms,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoice: FlowInvoice | null;
  fuel: FuelIndexSettings;
  /** Prestations déjà présentes sur une autre facture non annulée. */
  usedKeys: Set<string>;
  defaultTerms: number;
  onSave: (d: InvoiceDraft) => Promise<void>;
}) {
  const { clients } = useClients();
  const { licenseId } = useLicenseContext();
  const { cards } = useRateCards(licenseId);
  const lastMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const [clientId, setClientId] = useState('');
  const [month, setMonth] = useState(lastMonth);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [taxRate, setTaxRate] = useState(20);
  const [terms, setTerms] = useState(defaultTerms);
  const [notes, setNotes] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(invoice?.clientId ?? '');
    setMonth(invoice?.periodStart?.slice(0, 7) ?? lastMonth);
    setLines(invoice?.lines ?? []);
    setTaxRate(invoice?.taxRate ?? 20);
    setTerms(invoice?.paymentTermsDays ?? defaultTerms);
    setNotes(invoice?.notes ?? '');
    setPicked([]);
  }, [open, invoice, lastMonth, defaultTerms]);

  const { start, end } = monthBounds(month);
  const client = clients.find((c) => c.id === clientId);
  const card = clientId ? cards.get(clientId) : undefined;
  const work = useBillableWork(clientId || null, start, end, card);
  const onThis = new Set(lines.map((l) => l.sourceRouteId).filter(Boolean) as string[]);
  const available = (work.data ?? []).filter((w) => !usedKeys.has(w.key) || onThis.has(w.key));
  const totals = computeInvoiceTotals(lines, taxRate);
  const fuelReady = fuel.enabled && !!fuel.refIndex && !!fuel.currentIndex;

  const addPicked = () => {
    const add = available
      .filter((w) => picked.includes(w.key) && !onThis.has(w.key))
      .map((w) => ({ id: generateId('line'), description: w.label, quantity: 1, unitPrice: w.price, sourceRouteId: w.key }));
    if (!add.length) return toast.info('Ces prestations sont déjà sur la facture');
    setLines([...lines.filter((l) => !l.fuel), ...add, ...lines.filter((l) => l.fuel)]);
    setPicked([]);
    toast.success(`${add.length} prestation(s) ajoutée(s)`);
  };

  const setLine = (id: string, patch: Partial<InvoiceLine>) => setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!client) return toast.error('Choisissez le client');
    if (!lines.length) return toast.error('Ajoutez au moins une ligne');
    setBusy(true);
    try {
      await onSave({
        id: invoice?.id,
        clientId,
        client: {
          name: client.company || client.name,
          address: [client.address, [client.postal_code, client.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
          email: client.email || undefined,
          siren: client.siret ? client.siret.replace(/\D/g, '').slice(0, 9) : undefined,
        },
        periodStart: start,
        periodEnd: end,
        lines,
        taxRate,
        paymentTermsDays: terms,
        notes,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Modifier le brouillon' : 'Nouvelle facture'}</DialogTitle>
          <DialogDescription>Brouillon modifiable ; le numéro est attribué quand vous l'émettez.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Client (donneur d'ordre)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger aria-label="Client"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {card && <p className="text-xs text-primary">Grille tarifaire appliquée aux tournées</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-month">Mois facturé</Label>
              <Input id="inv-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>

          {clientId && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Prestations du mois</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addPicked} disabled={!picked.length}>
                  <Download className="h-4 w-4" /> Ajouter ({picked.length})
                </Button>
              </div>
              {work.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : !available.length ? (
                <p className="text-sm text-muted-foreground">Aucune tournée ni trajet à facturer pour ce client ce mois-ci.</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={picked.length === available.filter((w) => !onThis.has(w.key)).length && picked.length > 0}
                      onCheckedChange={(v) => setPicked(v ? available.filter((w) => !onThis.has(w.key)).map((w) => w.key) : [])}
                      aria-label="Tout cocher"
                    />
                    Tout cocher
                  </label>
                  <ScrollArea className="max-h-56">
                    <div className="space-y-1 pr-2">
                      {available.map((w) => {
                        const already = onThis.has(w.key);
                        return (
                          <label key={w.key} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                            <Checkbox
                              checked={picked.includes(w.key) || already}
                              disabled={already}
                              onCheckedChange={(v) => setPicked(v ? [...picked, w.key] : picked.filter((k) => k !== w.key))}
                              aria-label={w.label}
                            />
                            <span className="min-w-0 flex-1 truncate">{w.label}</span>
                            {w.status !== 'completed' && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[w.status] ?? w.status}</Badge>}
                            <span className="w-24 text-right">{w.priceSource === 'à saisir' ? <span className="text-xs text-muted-foreground">prix à saisir</span> : formatEuro(w.price)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lignes de la facture</Label>
              <div className="flex gap-1">
                {fuelReady && (
                  <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setLines(withFuelLine(lines, fuel))}>
                    <Fuel className="h-4 w-4" /> Indexation gazole
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setLines([...lines, { id: generateId('line'), description: '', quantity: 1, unitPrice: 0 }])}>
                  <Plus className="h-4 w-4" /> Ligne libre
                </Button>
              </div>
            </div>
            {!lines.length && <p className="text-sm text-muted-foreground">Cochez des prestations ou ajoutez une ligne.</p>}
            {lines.map((l) => (
              <div key={l.id} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-12 sm:col-span-6" value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} placeholder="Désignation" aria-label="Désignation" />
                <Input className="col-span-3 sm:col-span-2" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.id, { quantity: Number(e.target.value.replace(',', '.')) || 0 })} aria-label="Quantité" />
                <Input className="col-span-4 sm:col-span-2" inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(l.id, { unitPrice: Number(e.target.value.replace(',', '.')) || 0 })} aria-label="Prix unitaire HT" />
                <span className="col-span-4 text-right text-sm sm:col-span-1">{formatEuro(lineTotal(l))}</span>
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setLines(lines.filter((x) => x.id !== l.id))} aria-label="Supprimer la ligne">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-tva">TVA (%)</Label>
              <Input id="inv-tva" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value.replace(',', '.')) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-terms">Paiement à (jours)</Label>
              <Input id="inv-terms" inputMode="numeric" value={terms} onChange={(e) => setTerms(Number(e.target.value) || 0)} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">HT</span><span>{formatEuro(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{formatEuro(totals.tax)}</span></div>
              <div className="flex justify-between font-semibold"><span>TTC</span><span>{formatEuro(totals.total)}</span></div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea id="inv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Référence commande, mentions particulières…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer le brouillon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
