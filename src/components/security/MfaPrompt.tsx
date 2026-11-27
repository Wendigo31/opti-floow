import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { answerMfaPrompt, completeMfaIfNeeded, mfaCodeNeeded, onMfaPrompt } from '@/lib/mfa';

/**
 * Fenêtre « Code de double authentification », ouverte par la connexion quand le compte l'exige.
 * Au démarrage, une session restée sans code (onglet fermé pendant la saisie, par exemple)
 * redemande aussi le code : la base refuse toute donnée tant qu'il n'est pas saisi.
 */
export function MfaPrompt() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  useEffect(() => onMfaPrompt((o) => { setOpen(o); if (o) setCode(''); }), []);
  useEffect(() => {
    let cancelled = false;
    mfaCodeNeeded().then((needed) => {
      if (!needed || cancelled) return;
      // Code bon : on recharge pour relire les données avec la session confirmée.
      // Code faux 3 fois ou annulé : la session est fermée, retour à la connexion.
      completeMfaIfNeeded().finally(() => window.location.reload());
    });
    return () => { cancelled = true; };
  }, []);
  const valid = /^\d{6}$/.test(code.replace(/\s/g, ''));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) answerMfaPrompt(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Double authentification</DialogTitle>
          <DialogDescription>Saisissez le code à 6 chiffres affiché dans votre appli d'authentification.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) answerMfaPrompt(code); }}>
          <Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456"
            value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} className="text-center text-lg tracking-widest" />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => answerMfaPrompt(null)}>Annuler</Button>
            <Button type="submit" disabled={!valid}>Valider</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
