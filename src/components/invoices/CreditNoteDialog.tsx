import { useEffect, useState } from 'react';
import { FileMinus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Avoir sur une facture émise : une facture ne se modifie ni ne se supprime une
 * fois émise (obligation légale) ; on l'annule (avoir total) ou on la corrige
 * (avoir partiel, montant HT à déduire). Numéro AV-…, à la suite des factures.
 * Fichier partagé (bridge/shared/invoices) — même écran dans les 3 logiciels.
 */
export function CreditNoteDialog({
  invoiceNumber,
  leftHT,
  open,
  onOpenChange,
  onConfirm,
  rebillHint = "la facture passe « annulée » et la prestation peut être refacturée.",
}: {
  invoiceNumber: string;
  /** Montant HT encore créditable (facture moins les avoirs déjà émis). */
  leftHT: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** amountHT nul = avoir total. Rejette en cas d'échec (message affiché par l'appelant). */
  onConfirm: (reason: string, amountHT: number | null) => Promise<unknown>;
  rebillHint?: string;
}) {
  const left = Math.round(leftHT * 100) / 100;
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setMode('full');
      setAmount('');
      setReason('');
    }
  }, [open]);

  const value = mode === 'full' ? left : Number(amount.replace(',', '.'));
  const valid = reason.trim().length > 0 && value > 0 && value <= left;

  const submit = async () => {
    setPending(true);
    try {
      await onConfirm(reason.trim(), mode === 'full' ? null : value);
      onOpenChange(false);
    } catch {
      /* message affiché par l'appelant */
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avoir sur la facture {invoiceNumber}</DialogTitle>
          <DialogDescription>
            Une facture émise ne se modifie plus : l'avoir l'annule ou la corrige, et il est transmis au client comme une facture.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'full' | 'partial')} className="gap-2">
            <Label htmlFor="cn-full" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
              <RadioGroupItem id="cn-full" value="full" className="mt-0.5" />
              <span>
                <span className="block font-medium">Annuler la facture</span>
                <span className="block text-xs text-muted-foreground">Avoir de {eur(left)} HT ; {rebillHint}</span>
              </span>
            </Label>
            <Label htmlFor="cn-partial" className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
              <RadioGroupItem id="cn-partial" value="partial" className="mt-0.5" />
              <span className="flex-1">
                <span className="block font-medium">Déduire un montant</span>
                <span className="block text-xs text-muted-foreground">Remise, litige, erreur de prix… (jusqu'à {eur(left)} HT)</span>
                {mode === 'partial' && (
                  <Input
                    className="mt-2"
                    inputMode="decimal"
                    placeholder="Montant HT à déduire"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Montant HT à déduire"
                    autoFocus
                  />
                )}
              </span>
            </Label>
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="cn-reason">Motif (imprimé sur l'avoir)</Label>
            <Textarea id="cn-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : erreur sur le prix convenu, retard de livraison…" />
          </div>
          {mode === 'partial' && amount && !(value > 0 && value <= left) && (
            <p className="text-xs text-destructive">Le montant doit être compris entre 0,01 € et {eur(left)} HT.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Annuler</Button>
            <Button onClick={() => void submit()} disabled={!valid || pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileMinus className="mr-2 h-4 w-4" />}
              Créer l'avoir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
