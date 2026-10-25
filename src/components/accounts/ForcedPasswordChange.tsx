import { useState } from 'react';
import { KeyRound, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeOwnPassword, passwordProblem } from '@/lib/accounts';

/**
 * Première connexion avec un mot de passe provisoire : la personne choisit son
 * mot de passe personnel avant d'accéder au logiciel. Identique dans les 3 logiciels.
 */
export function ForcedPasswordChange({
  name,
  onDone,
  onLogout,
}: {
  name?: string | null;
  onDone: () => void | Promise<void>;
  onLogout: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pwd, confirm);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await changeOwnPassword(pwd);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Choisissez votre mot de passe</h1>
            {name && <p className="text-sm text-muted-foreground">{name}</p>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Vous vous êtes connecté avec un mot de passe provisoire. Choisissez maintenant votre mot de passe
          personnel : il ne sera connu que de vous.
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input id="new-password" type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmez le mot de passe</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <p className="text-xs text-muted-foreground">Au moins 8 caractères, avec des lettres et des chiffres.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer et continuer
        </Button>
        <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </form>
    </div>
  );
}
