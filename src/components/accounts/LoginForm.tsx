import { useState, type ReactNode } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Écran de connexion — identique dans OptiFlow, OptiFret et OptiXpress :
 * le logo du logiciel, puis email / identifiant (la partie de l'email avant le @)
 * et mot de passe.
 */
export function LoginForm({
  logo,
  appName,
  onSubmit,
  canSubmit = true,
  footer,
}: {
  logo: string;
  appName: string;
  /** Renvoie un message d'erreur, ou null si la connexion a réussi. */
  onSubmit: (login: string, password: string) => Promise<string | null>;
  canSubmit?: boolean;
  footer?: ReactNode;
}) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      setError('Saisissez votre email (ou identifiant) et votre mot de passe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setError(await onSubmit(login.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-4">
      <img src={logo} alt={appName} className="h-24 w-auto max-w-[220px] object-contain sm:h-28" />
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-center text-lg font-semibold">Connexion à {appName}</h1>
        <div className="space-y-2">
          <Label htmlFor="login">Email / identifiant</Label>
          <Input
            id="login"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            placeholder="email ou identifiant"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </div>
        {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || !canSubmit}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          Se connecter
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          L'identifiant est la partie de votre email avant le @. Pas encore de mot de passe, ou oublié ?
          Demandez-en un à votre direction ou à vos RH.
        </p>
        {footer}
      </form>
    </div>
  );
}
