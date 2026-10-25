/**
 * Première connexion : tant que la Direction n'a pas saisi le téléphone et
 * l'email de la société, l'application est bloquée pour toute la société.
 * - Direction : formulaire obligatoire (les autres infos société sont déjà
 *   remplies depuis l'annuaire officiel par OptiCentral) ;
 * - autres rôles : message d'attente.
 * Identique dans OptiFlow, OptiFret et OptiXpress.
 */
import { useState } from 'react';
import { Building2, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeCompanyContact, useRefreshCompanyAccess } from '@/lib/companyAccess';

interface Props {
  licenseId: string;
  companyName?: string | null;
  isDirection: boolean;
  /** Code de licence et email de l'utilisateur : preuve d'appartenance à la Direction. */
  code?: string | null;
  userEmail?: string | null;
  onLogout: () => void;
}

export function CompanyContactGate({ licenseId, companyName, isDirection, code, userEmail, onLogout }: Props) {
  const refresh = useRefreshCompanyAccess();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) return setError('Numéro de téléphone invalide.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email invalide.');
    setBusy(true);
    try {
      await completeCompanyContact({ licenseId, phone, email: email.trim(), code, userEmail });
      await refresh();
    } catch (err) {
      setError((err as Error).message || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Fiche société à compléter</h1>
            {companyName && <p className="text-sm text-muted-foreground">{companyName}</p>}
          </div>
        </div>

        {isDirection ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Avant d'utiliser l'application, indiquez le téléphone et l'email de contact de la société.
              Les autres informations ont été remplies depuis l'annuaire officiel des entreprises.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="company-phone">Téléphone de la société</Label>
              <Input id="company-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05 61 00 00 00" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-email">Email de la société</Label>
              <Input id="company-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@societe.fr" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer et accéder à l'application
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            La Direction de votre société doit d'abord compléter la fiche société (téléphone et email).
            L'application sera accessible dès que ce sera fait.
          </p>
        )}

        <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
