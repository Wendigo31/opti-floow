import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PALLET_TYPES } from '@/lib/pallets';
import type { NewPalletMovement } from '@/hooks/usePallets';

/** Saisie d'un échange de palettes (laissées / récupérées). Fichier partagé. */
export function PalletMovementDialog({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  reference,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  reference?: string;
  onSave: (m: NewPalletMovement) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<NewPalletMovement>({ client_id: '', movement_date: today, pallet_type: 'EUR', given: 0, returned: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setForm({ client_id: defaultClientId ?? '', movement_date: today, pallet_type: 'EUR', given: 0, returned: 0, reference: reference ?? null, site: null, note: null });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultClientId, reference]);
  const int = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const valid = !!form.client_id && (form.given > 0 || form.returned > 0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Échange de palettes</DialogTitle>
          <DialogDescription>Palettes laissées chez le client et palettes récupérées lors du passage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger aria-label="Client"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pal-given">Laissées chez le client</Label>
              <Input id="pal-given" inputMode="numeric" value={form.given || ''} onChange={(e) => setForm({ ...form, given: int(e.target.value) })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pal-returned">Récupérées</Label>
              <Input id="pal-returned" inputMode="numeric" value={form.returned || ''} onChange={(e) => setForm({ ...form, returned: int(e.target.value) })} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.pallet_type} onValueChange={(v) => setForm({ ...form, pallet_type: v })}>
                <SelectTrigger aria-label="Type de palette"><SelectValue /></SelectTrigger>
                <SelectContent>{PALLET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pal-date">Date</Label>
              <Input id="pal-date" type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value || today })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pal-site">Lieu (facultatif)</Label>
            <Input id="pal-site" value={form.site ?? ''} onChange={(e) => setForm({ ...form, site: e.target.value || null })} placeholder="Entrepôt, quai, magasin…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pal-ref">Référence (facultatif)</Label>
            <Input id="pal-ref" value={form.reference ?? ''} onChange={(e) => setForm({ ...form, reference: e.target.value || null })} placeholder="N° d'affrètement, bon de livraison…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={!valid || busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
