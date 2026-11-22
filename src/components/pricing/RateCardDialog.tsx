import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { emptyBands, emptyRateCard, priceFromRateCard, RATE_BASIS_LABELS, type RateBand, type RateBasis, type RateCard, type RateComponent } from '@/lib/rateCard';

/**
 * Édition de la grille tarifaire d'un client : base, tranches (prix à l'unité ou
 * forfait), minimum de perception, frais annexes, validité, plus un essai de
 * calcul. Même écran dans les 3 logiciels. Fichier partagé (bridge/shared/pricing).
 */
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function RateCardDialog({
  open,
  onOpenChange,
  clientName,
  card,
  bases,
  onSave,
  onDelete,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientName: string;
  card: RateCard | null | undefined;
  /** Bases proposées dans ce logiciel (la première par défaut). */
  bases: RateBasis[];
  onSave: (card: RateCard) => Promise<void>;
  onDelete?: () => Promise<void>;
  /** Grille consultable seulement (rôle sans droit de modification). */
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<RateCard>(card ?? emptyRateCard(bases[0]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trial, setTrial] = useState('');

  useEffect(() => {
    if (open) {
      setForm(card ?? emptyRateCard(bases[0]));
      setError(null);
      setTrial('');
    }
  }, [open, card, bases]);

  const meta = RATE_BASIS_LABELS[form.basis];
  const isZone = form.basis === 'zone';
  const mixed = (form.components ?? []).length > 0;
  const setComponent = (i: number, next: RateComponent) => setForm({ ...form, components: (form.components ?? []).map((c, j) => (j === i ? next : c)) });
  const trialResult = trial
    ? priceFromRateCard(form, isZone ? { destination: trial } : { km: num(trial), pallets: num(trial), weightKg: num(trial), stops: num(trial), packages: num(trial), hours: num(trial), tours: mixed ? 1 : num(trial) })
    : null;

  const bandsValid = (basis: RateBasis, bands: RateBand[]) => bands.length > 0 && bands.every((b) => b.price >= 0 && (basis === 'zone' ? !!b.zone?.trim() : true));
  const valid = bandsValid(form.basis, form.bands) && (form.components ?? []).every((c) => bandsValid(c.basis, c.bands));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const clean = (bands: RateBand[]) => bands.map((b) => ({ ...b, zone: b.zone?.trim() || null }));
      await onSave({ ...form, bands: clean(form.bands), components: (form.components ?? []).map((c) => ({ ...c, bands: clean(c.bands) })) });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grille tarifaire — {clientName}</DialogTitle>
          <DialogDescription>Le prix calculé est proposé automatiquement sur les devis et les factures de ce client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Le prix dépend de</Label>
              <Select value={form.basis} onValueChange={(v) => setForm({ ...emptyRateCard(v as RateBasis), components: form.components, minimum: form.minimum, extras: form.extras, fuelIndexed: form.fuelIndexed, validFrom: form.validFrom, validTo: form.validTo, notes: form.notes })}>
                <SelectTrigger aria-label="Base de la grille"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bases.map((b) => (
                    <SelectItem key={b} value={b}>{RATE_BASIS_LABELS[b].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{meta.hint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-min">Minimum de perception (€ HT)</Label>
              <Input id="rc-min" inputMode="decimal" value={form.minimum ?? ''} onChange={(e) => setForm({ ...form, minimum: num(e.target.value) })} placeholder="Aucun" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tranches</Label>
            <BandsEditor basis={form.basis} bands={form.bands} onChange={(bands) => setForm({ ...form, bands })} prefix="" />
          </div>

          <div className="space-y-2">
            <Label>Autres éléments de prix (additionnés)</Label>
            <p className="text-xs text-muted-foreground">Pour une grille mixte : par exemple un forfait à la journée, plus un prix au point, plus les km au-delà d'un seuil.</p>
            {(form.components ?? []).map((c, ci) => (
              <div key={ci} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Select value={c.basis} onValueChange={(v) => setComponent(ci, { basis: v as RateBasis, bands: emptyBands(v as RateBasis) })}>
                    <SelectTrigger className="max-w-56" aria-label={`Base de l'élément ${ci + 1}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {bases.map((b) => (
                        <SelectItem key={b} value={b}>{RATE_BASIS_LABELS[b].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => setForm({ ...form, components: (form.components ?? []).filter((_, j) => j !== ci) })}>
                    Retirer
                  </Button>
                </div>
                <BandsEditor basis={c.basis} bands={c.bands} onChange={(bands) => setComponent(ci, { ...c, bands })} prefix={`de l'élément ${ci + 1} `} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, components: [...(form.components ?? []), { basis: bases.find((b) => b !== form.basis) ?? bases[0], bands: emptyBands(bases.find((b) => b !== form.basis) ?? bases[0]) }] })} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un élément de prix</Button>
          </div>

          <div className="space-y-2">
            <Label>Frais annexes (cochés au cas par cas)</Label>
            {(form.extras ?? []).map((x, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-7" value={x.label} onChange={(e) => setForm({ ...form, extras: form.extras!.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} placeholder="Hayon, attente (1 h), rendez-vous…" aria-label={`Frais annexe ${i + 1}`} />
                <Input className="col-span-4" inputMode="decimal" value={x.price} onChange={(e) => setForm({ ...form, extras: form.extras!.map((y, j) => (j === i ? { ...y, price: num(e.target.value) ?? 0 } : y)) })} aria-label={`Prix du frais annexe ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setForm({ ...form, extras: form.extras!.filter((_, j) => j !== i) })} aria-label={`Supprimer le frais annexe ${i + 1}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, extras: [...(form.extras ?? []), { label: '', price: 0 }] })} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un frais annexe</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rc-from">Valable du</Label>
              <Input id="rc-from" type="date" value={form.validFrom ?? ''} onChange={(e) => setForm({ ...form, validFrom: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-to">au</Label>
              <Input id="rc-to" type="date" value={form.validTo ?? ''} onChange={(e) => setForm({ ...form, validTo: e.target.value || null })} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Switch checked={form.fuelIndexed !== false} onCheckedChange={(v) => setForm({ ...form, fuelIndexed: v })} aria-label="Indexation gazole en plus" />
              Indexation gazole en plus
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rc-notes">Conditions particulières</Label>
            <Textarea id="rc-notes" rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Ex. : rendez-vous obligatoire, délai de paiement…" />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <Label htmlFor="rc-trial" className="text-xs text-muted-foreground">Essayer : {isZone ? 'code postal de livraison' : mixed ? 'une même quantité pour chaque base (1 tournée)' : `nombre de ${meta.unit}`}</Label>
            <div className="mt-1 flex items-center gap-3">
              <Input id="rc-trial" className="max-w-40" value={trial} onChange={(e) => setTrial(e.target.value)} placeholder={isZone ? '31200' : '250'} />
              {trialResult && (trialResult.ok ? <span className="font-semibold">{eur(trialResult.amount)} HT</span> : <span className="text-muted-foreground">{trialResult.reason}</span>)}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {readOnly ? (
            <p className="text-xs text-muted-foreground">Seules la Direction et la Comptabilité peuvent modifier cette grille.</p>
          ) : card && onDelete ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => void onDelete().then(() => onOpenChange(false))} disabled={busy}>
              Supprimer la grille
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
            {!readOnly && <Button type="button" onClick={() => void submit()} disabled={!valid || busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer la grille
            </Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tranches d'une base : de / à (ou zone), prix, à l'unité ou forfait. */
function BandsEditor({ basis, bands, onChange, prefix }: { basis: RateBasis; bands: RateBand[]; onChange: (b: RateBand[]) => void; prefix: string }) {
  const meta = RATE_BASIS_LABELS[basis];
  const isZone = basis === 'zone';
  const setBand = (i: number, patch: Partial<RateBand>) => onChange(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const addBand = () => {
    const last = bands[bands.length - 1];
    const from = last?.to != null ? Number(last.to) + 1 : null;
    onChange([...bands, isZone ? { zone: '', price: 0, mode: 'flat' } : { from, to: null, price: 0, mode: last?.mode ?? 'unit' }]);
  };
  return (
    <div className="space-y-2">
      {bands.map((b, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-2">
          {isZone ? (
            <Input className="col-span-5" value={b.zone ?? ''} onChange={(e) => setBand(i, { zone: e.target.value })} placeholder="Département (31) ou * pour les autres" aria-label={`Zone de la tranche ${i + 1} ${prefix}`.trim()} />
          ) : (
            <>
              <Input className="col-span-2" inputMode="decimal" value={b.from ?? ''} onChange={(e) => setBand(i, { from: num(e.target.value) })} placeholder="de" aria-label={`Début de la tranche ${i + 1} ${prefix}`.trim()} />
              <Input className="col-span-3" inputMode="decimal" value={b.to ?? ''} onChange={(e) => setBand(i, { to: num(e.target.value) })} placeholder={`à (vide = et plus) ${meta.unit}`} aria-label={`Fin de la tranche ${i + 1} ${prefix}`.trim()} />
            </>
          )}
          <Input className="col-span-3" inputMode="decimal" value={b.price} onChange={(e) => setBand(i, { price: num(e.target.value) ?? 0 })} aria-label={`Prix de la tranche ${i + 1} ${prefix}`.trim()} />
          {isZone ? (
            <span className="col-span-3 text-xs text-muted-foreground">€ HT par envoi</span>
          ) : (
            <Select value={b.mode} onValueChange={(v) => setBand(i, { mode: v as RateBand['mode'] })}>
              <SelectTrigger className="col-span-3" aria-label={`Type de prix de la tranche ${i + 1} ${prefix}`.trim()}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">€ / {meta.unit}</SelectItem>
                <SelectItem value="flat">forfait</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => onChange(bands.filter((_, j) => j !== i))} aria-label={`Supprimer la tranche ${i + 1} ${prefix}`.trim()} disabled={bands.length === 1}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addBand} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter une tranche</Button>
    </div>
  );
}
