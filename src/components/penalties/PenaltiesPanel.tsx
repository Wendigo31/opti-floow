import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, FileDown, Gavel, Loader2, Pencil, Percent, Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePenalties } from '@/hooks/usePenalties';
import { exportLatePenaltyPDF } from '@/lib/pdfPenalty';
import {
  addDaysIso,
  DESIGNATION_DAYS,
  designationDaysLeft,
  FINE_STATUS,
  LATE_STATUS,
  lateInvoices,
  penaltyTotals,
  WITHHOLDING_REASONS,
  WITHHOLDING_STATUS,
  type LateInvoice,
  type Penalty,
  type PenaltyKind,
} from '@/lib/penalties';

/**
 * Comptabilité › Pénalités : retenues des clients, pénalités de retard de
 * paiement, amendes et PV. Même écran dans OptiFret, OptiFlow et OptiXpress
 * (fichier partagé, bridge/shared/penalties) ; chaque logiciel lui passe ses
 * clients, conducteurs, véhicules, prestations et factures.
 */
export interface PenaltyOption { id: string; name: string }

const NONE = '__none__';
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fr = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const today = () => new Date().toISOString().slice(0, 10);

export function PenaltiesPanel({
  licenseId,
  company,
  clients,
  drivers,
  vehicles,
  works = [],
  workLabel = 'Prestation',
  invoices,
  driverLabel = 'Conducteur',
}: {
  licenseId: string | null | undefined;
  company: { name: string; address?: string | null; siren?: string | null; email?: string | null };
  clients: PenaltyOption[];
  drivers: PenaltyOption[];
  vehicles: PenaltyOption[];
  /** Tournées / missions / affrètements auxquels rattacher une retenue (facultatif). */
  works?: PenaltyOption[];
  workLabel?: string;
  /** Factures du logiciel (pour les pénalités de retard de paiement). */
  invoices: LateInvoice[];
  driverLabel?: string;
}) {
  const { rows, loading, lateRate, save, setStatus, remove, saveRate } = usePenalties(licenseId);
  const [tab, setTab] = useState<'withholding' | 'late' | 'fines'>('withholding');
  const [edit, setEdit] = useState<Partial<Penalty> | null>(null);
  const [busy, setBusy] = useState(false);
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const asOf = today();
  const month = asOf.slice(0, 7);
  const totals = useMemo(() => penaltyTotals(rows, month), [rows, month]);
  const all = useMemo(() => penaltyTotals(rows), [rows]);
  const nameOf = (list: PenaltyOption[], id?: string | null) => (id ? list.find((x) => x.id === id)?.name ?? '—' : '—');

  const withholdings = rows.filter((r) => r.kind === 'client_withholding');
  const fines = rows.filter((r) => r.kind === 'fine');
  const claims = rows.filter((r) => r.kind === 'late_payment');
  const late = useMemo(() => lateInvoices(invoices, lateRate, asOf), [invoices, lateRate, asOf]);
  // Réclamation de pénalités : la facture concernée est gardée dans route_id (colonne « prestation »).
  const claimOf = (invoiceId: string) => claims.find((c) => c.route_id === invoiceId);

  const startNew = (kind: PenaltyKind) =>
    setEdit({ kind, occurred_on: asOf, amount: 0, status: 'open', reason: kind === 'client_withholding' ? WITHHOLDING_REASONS[0] : null, due_on: kind === 'fine' ? addDaysIso(asOf, DESIGNATION_DAYS) : null });

  const submit = async () => {
    if (!edit?.kind || !edit.occurred_on) return;
    setBusy(true);
    try {
      await save({ ...edit, kind: edit.kind, occurred_on: edit.occurred_on, amount: Number(edit.amount) || 0 } as Penalty);
      toast.success('Enregistré');
      setEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const claim = async (inv: LateInvoice) => {
    const item = late.find((l) => l.invoice.id === inv.id);
    if (!item) return;
    exportLatePenaltyPDF({ company, invoice: inv, calc: item.calc, ratePct: lateRate, asOf });
    if (!claimOf(inv.id)) {
      await act(() => save({ kind: 'late_payment', occurred_on: asOf, amount: item.calc.total, status: 'open', reference: inv.number, route_id: inv.id, client_id: inv.clientId, reason: `${item.calc.days} jours de retard à ${lateRate} %` }));
    }
  };

  const statusSelect = (p: Penalty, map: Record<string, { label: string }>) => (
    <Select value={p.status} onValueChange={(v) => void act(() => setStatus(p.id, v))}>
      <SelectTrigger className="h-8 w-44" aria-label="Statut"><SelectValue /></SelectTrigger>
      <SelectContent>
        {Object.entries(map).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const rowActions = (p: Penalty) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => void act(() => remove(p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Retenues des clients ce mois', value: eur(totals.withheld), hint: `dont ${eur(all.withheldOpen)} à vérifier ou contester`, icon: Receipt },
          { label: 'Pénalités de retard réclamées', value: eur(all.lateClaimed), hint: `${eur(all.lateCollected)} encaissées`, icon: Wallet },
          { label: 'Factures en retard', value: String(late.filter((l) => !l.invoice.paidAt).length), hint: `taux ${lateRate} % + 40 € par facture`, icon: AlertTriangle },
          { label: 'PV : conducteur à désigner', value: String(all.finesToDesignate), hint: `${eur(all.finesOpen)} d'amendes en cours`, icon: Gavel },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start gap-3 p-4">
              <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="withholding">Retenues des clients</TabsTrigger>
          <TabsTrigger value="late">Retards de paiement</TabsTrigger>
          <TabsTrigger value="fines">Amendes et PV</TabsTrigger>
        </TabsList>

        {loading && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>}

        <TabsContent value="withholding" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Ce que vos donneurs d'ordre retiennent sur vos paiements (retard, colis perdu ou abîmé…). Contestez dans les délais de votre contrat.</p>
            <Button size="sm" className="gap-1.5" onClick={() => startNew('client_withholding')}><Plus className="h-4 w-4" /> Nouvelle retenue</Button>
          </div>
          {withholdings.length === 0 ? <Empty text="Aucune retenue enregistrée." /> : (
            <ul className="divide-y rounded-lg border">
              {withholdings.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{fr(p.occurred_on)} · {nameOf(clients, p.client_id)} · {eur(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.reason}{p.route_id ? ` · ${workLabel} : ${nameOf(works, p.route_id)}` : ''}{p.reference ? ` · réf. ${p.reference}` : ''}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                  </div>
                  {statusSelect(p, WITHHOLDING_STATUS)}
                  {rowActions(p)}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="late" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Entre professionnels, une facture payée en retard donne droit, sans relance, à des pénalités au taux de vos conditions générales
              (au moins 3 fois le taux d'intérêt légal) et à 40 € d'indemnité de recouvrement par facture (art. L441-10 du Code de commerce).
            </p>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="late-rate" className="text-xs">Taux annuel (%)</Label>
                <Input id="late-rate" className="h-9 w-24" inputMode="decimal" value={rateDraft ?? String(lateRate)} onChange={(e) => setRateDraft(e.target.value)} />
              </div>
              {rateDraft != null && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                  const v = Number(rateDraft.replace(',', '.'));
                  if (!(v > 0 && v < 100)) { toast.error('Taux invalide'); return; }
                  void act(async () => { await saveRate(v); setRateDraft(null); toast.success('Taux enregistré'); });
                }}><Percent className="h-4 w-4" /> Enregistrer</Button>
              )}
            </div>
          </div>
          {late.length === 0 ? <Empty text="Aucune facture en retard : tout est réglé à l'échéance." /> : (
            <ul className="divide-y rounded-lg border">
              {late.map(({ invoice, calc }) => {
                const c = claimOf(invoice.id);
                return (
                  <li key={invoice.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{invoice.number} · {invoice.clientName} · {eur(invoice.amountTTC)} TTC</p>
                      <p className="text-xs text-muted-foreground">
                        Échue le {fr(invoice.dueDate)} · {invoice.paidAt ? `payée le ${fr(invoice.paidAt)}` : 'non payée'} · {calc.days} jours de retard
                        {' '}· pénalités {eur(calc.interest)} + 40 € = <span className="font-medium text-foreground">{eur(calc.total)}</span>
                      </p>
                    </div>
                    {c ? statusSelect(c, LATE_STATUS) : null}
                    <Button size="sm" variant={c ? 'ghost' : 'outline'} className="gap-1.5" onClick={() => void claim(invoice)}>
                      <FileDown className="h-4 w-4" /> {c ? 'Décompte PDF' : 'Réclamer (PDF)'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="fines" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Une société doit désigner le conducteur sous {DESIGNATION_DAYS} jours après l'envoi de l'avis (sinon amende pouvant aller jusqu'à 750 €).
              Une amende ne peut pas être retenue sur le salaire (art. L1331-2 du Code du travail).
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => startNew('fine')}><Plus className="h-4 w-4" /> Nouveau PV</Button>
          </div>
          {fines.length === 0 ? <Empty text="Aucune amende enregistrée." /> : (
            <ul className="divide-y rounded-lg border">
              {fines.map((p) => {
                const left = designationDaysLeft(p, asOf);
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{fr(p.occurred_on)} · {eur(p.amount)} · {nameOf(vehicles, p.vehicle_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.reason || 'Infraction'}{p.reference ? ` · avis n° ${p.reference}` : ''} · {driverLabel} : {nameOf(drivers, p.driver_id)}
                      </p>
                      {p.status === 'open' && (
                        <p className={`text-xs ${left < 7 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                          {left >= 0 ? `Désignation avant le ${fr(p.due_on || addDaysIso(p.occurred_on, DESIGNATION_DAYS))} (${left} j)` : `Délai de désignation dépassé de ${-left} j`}
                        </p>
                      )}
                    </div>
                    {statusSelect(p, FINE_STATUS)}
                    {rowActions(p)}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.kind === 'fine' ? 'Amende / PV' : 'Retenue d\'un client'}</DialogTitle>
            <DialogDescription>{edit?.kind === 'fine' ? 'Reportez les informations de l\'avis de contravention.' : 'Montant retenu par le donneur d\'ordre sur votre paiement.'}</DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={edit.kind === 'fine' ? 'Date de l\'infraction' : 'Date'}>
                <Input type="date" value={edit.occurred_on ?? ''} onChange={(e) => setEdit({ ...edit, occurred_on: e.target.value })} />
              </Field>
              <Field label={edit.kind === 'fine' ? 'Montant de l\'amende (€)' : 'Montant retenu (€ HT)'}>
                <Input inputMode="decimal" value={edit.amount ?? ''} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value.replace(',', '.')) || 0 })} />
              </Field>
              {edit.kind === 'client_withholding' ? (
                <>
                  <Field label="Client">
                    <Pick value={edit.client_id} options={clients} onChange={(v) => setEdit({ ...edit, client_id: v })} placeholder="Choisir le client" />
                  </Field>
                  <Field label="Motif">
                    <Select value={edit.reason ?? WITHHOLDING_REASONS[0]} onValueChange={(v) => setEdit({ ...edit, reason: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WITHHOLDING_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  {works.length > 0 && (
                    <Field label={`${workLabel} concernée`} wide>
                      <Pick value={edit.route_id} options={works} onChange={(v) => setEdit({ ...edit, route_id: v })} placeholder="Aucune" />
                    </Field>
                  )}
                  <Field label="Référence (réclamation, avoir du client…)" wide>
                    <Input value={edit.reference ?? ''} onChange={(e) => setEdit({ ...edit, reference: e.target.value || null })} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="N° de l'avis">
                    <Input value={edit.reference ?? ''} onChange={(e) => setEdit({ ...edit, reference: e.target.value || null })} />
                  </Field>
                  <Field label="Date de l'avis (envoi)">
                    <Input type="date" value={edit.due_on ? addDaysIso(edit.due_on, -DESIGNATION_DAYS) : ''} onChange={(e) => setEdit({ ...edit, due_on: e.target.value ? addDaysIso(e.target.value, DESIGNATION_DAYS) : null })} />
                  </Field>
                  <Field label="Infraction" wide>
                    <Input value={edit.reason ?? ''} onChange={(e) => setEdit({ ...edit, reason: e.target.value || null })} placeholder="Excès de vitesse, stationnement…" />
                  </Field>
                  <Field label="Véhicule">
                    <Pick value={edit.vehicle_id} options={vehicles} onChange={(v) => setEdit({ ...edit, vehicle_id: v })} placeholder="Choisir" />
                  </Field>
                  <Field label={driverLabel}>
                    <Pick value={edit.driver_id} options={drivers} onChange={(v) => setEdit({ ...edit, driver_id: v })} placeholder="À identifier" />
                  </Field>
                </>
              )}
              <Field label="Notes" wide>
                <Textarea rows={2} value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value || null })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={busy}>Annuler</Button>
            <Button onClick={() => void submit()} disabled={busy || !edit?.occurred_on || !(Number(edit?.amount) >= 0)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Pick({ value, options, onChange, placeholder }: { value?: string | null; options: PenaltyOption[]; onChange: (v: string | null) => void; placeholder: string }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
