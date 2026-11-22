import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { confirmMfaEnrollment, disableMfa, listTotpFactors, startMfaEnrollment, verifyMfaCode, type MfaFactor } from '@/lib/mfa';

/** Paramètres › Mon compte : activer ou désactiver la double authentification du compte connecté. */
export function TwoFactorCard() {
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => listTotpFactors().then(setFactors).catch(() => setFactors([]));
  useEffect(() => { void load(); }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const active = (factors?.length ?? 0) > 0;
  const validCode = /^\d{6}$/.test(code.replace(/\s/g, ''));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Double authentification
          {factors && <Badge variant={active ? 'default' : 'outline'}>{active ? 'Activée' : 'Désactivée'}</Badge>}
        </CardTitle>
        <CardDescription>
          En plus du mot de passe, un code à 6 chiffres donné par une appli sur votre téléphone (Google Authenticator,
          Microsoft Authenticator, Authy…) est demandé à chaque connexion. Recommandé pour la Direction et la Comptabilité.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {factors === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : enroll ? (
          <div className="space-y-3">
            <p className="text-sm">1. Scannez ce QR code avec votre appli d'authentification.</p>
            <img src={enroll.qr} alt="QR code de double authentification" className="h-44 w-44 rounded border bg-white p-2" />
            <p className="text-xs text-muted-foreground break-all">Ou saisissez la clé à la main : <span className="font-mono">{enroll.secret}</span></p>
            <p className="text-sm">2. Saisissez le code à 6 chiffres affiché par l'appli.</p>
            <div className="flex gap-2">
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456" value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} className="max-w-40 text-center tracking-widest" />
              <Button disabled={!validCode || busy} onClick={() => void run(async () => {
                await confirmMfaEnrollment(enroll.factorId, code);
                setEnroll(null); setCode('');
                toast.success('Double authentification activée');
                await load();
              })}>Activer</Button>
              <Button variant="ghost" onClick={() => { setEnroll(null); setCode(''); }}>Annuler</Button>
            </div>
          </div>
        ) : active ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Pour la désactiver, saisissez un code de votre appli.</p>
            <div className="flex gap-2">
              <Input inputMode="numeric" maxLength={7} placeholder="123 456" value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} className="max-w-40 text-center tracking-widest" />
              <Button variant="outline" className="gap-2" disabled={!validCode || busy} onClick={() => void run(async () => {
                await verifyMfaCode(code);
                await disableMfa(factors![0].id);
                setCode('');
                toast.success('Double authentification désactivée');
                await load();
              })}><ShieldOff className="h-4 w-4" /> Désactiver</Button>
            </div>
          </div>
        ) : (
          <Button className="gap-2" disabled={busy} onClick={() => void run(async () => setEnroll(await startMfaEnrollment()))}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Activer la double authentification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
