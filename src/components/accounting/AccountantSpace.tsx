import { useState } from 'react';
import { Check, Copy, Download, FolderArchive, KeyRound, Loader2, Mail, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountantAccess } from '@/hooks/useAccountantAccess';
import { makeZip, type ZipEntry } from '@/lib/zip';

/**
 * Comptabilité › Expert-comptable : dossier comptable du mois (ZIP déposé et
 * téléchargeable) et liens d'accès en lecture seule pour le cabinet.
 * Même écran dans les 3 logiciels (fichier partagé, bridge/shared/accounting) ;
 * chaque logiciel fournit `buildFiles` (ses factures, avoirs, FEC, fiches de paie…).
 */
export interface DossierBuild {
  files: ZipEntry[];
  contents: { label: string; count: number }[];
}

const fr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
const monthLabel = (p: string) => new Date(`${p}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const size = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(n / 1000))} ko`);

export function AccountantSpace({
  licenseId,
  companyName,
  appName,
  buildFiles,
}: {
  licenseId: string | null | undefined;
  companyName: string;
  appName: string;
  buildFiles: (period: string) => Promise<DossierBuild>;
}) {
  const acc = useAccountantAccess(licenseId);
  const [period, setPeriod] = useState(lastMonth());
  const [building, setBuilding] = useState(false);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const portal = (token: string) => `${window.location.origin}/espace-comptable#t=${token}`;

  const prepare = async () => {
    setBuilding(true);
    try {
      const { files, contents } = await buildFiles(period);
      const zip = makeZip(files);
      await acc.uploadExport(period, zip, contents);
      // Copie locale immédiate pour la personne qui prépare le dossier.
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dossier-comptable-${period}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`Dossier de ${monthLabel(period)} prêt`, { description: 'Votre expert-comptable le retrouve dans son espace.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  const create = async () => {
    try {
      const token = await acc.createLink(label.trim() || 'Expert-comptable', email.trim() || null, companyName);
      setNewLink(portal(token));
      setCopied(false);
      setLabel('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const mailto = (link: string) =>
    `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(`Accès comptable — ${companyName}`)}&body=${encodeURIComponent(`Bonjour,\n\nVoici votre accès à nos dossiers comptables mensuels (factures Factur-X, FEC, fiches de paie) :\n${link}\n\nCe lien est personnel : merci de ne pas le transférer.\n\nCordialement,\n${companyName}`)}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FolderArchive className="h-4 w-4" /> Dossier comptable du mois</CardTitle>
          <CardDescription>Factures et avoirs au format Factur-X, FEC des ventes, fiches de paie validées, pénalités et récapitulatifs en tableur, dans un seul fichier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-period">Mois</Label>
              <Input id="acc-period" type="month" className="w-44" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <Button className="gap-2" onClick={() => void prepare()} disabled={building || !/^\d{4}-\d{2}$/.test(period)}>
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderArchive className="h-4 w-4" />}
              Préparer le dossier
            </Button>
          </div>
          {acc.exports.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {acc.exports.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">{monthLabel(e.period)}</p>
                    <p className="text-xs text-muted-foreground">
                      Préparé le {fr(e.created_at)} · {size(e.size)}
                      {e.contents?.length ? ` · ${e.contents.map((c) => `${c.count} ${c.label}`).join(', ')}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void acc.downloadUrl(e.path).then((u) => window.open(u, '_blank')).catch((err) => toast.error(String(err?.message ?? err)))}>
                    <Download className="h-4 w-4" /> Télécharger
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Accès de votre expert-comptable</CardTitle>
          <CardDescription>
            Un lien personnel, en lecture seule : le cabinet voit et télécharge vos dossiers mensuels, sans compte et sans accès au reste de {appName}.
            Valable 12 mois, révocable à tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="acc-label">Cabinet</Label>
              <Input id="acc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cabinet Martin & associés" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">Email du cabinet (facultatif)</Label>
              <Input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="compta@cabinet.fr" />
            </div>
            <Button onClick={() => void create()} className="gap-2"><KeyRound className="h-4 w-4" /> Créer le lien</Button>
          </div>

          {newLink && (
            <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm font-medium">Lien créé : copiez-le maintenant, il ne sera plus affiché.</p>
              <div className="flex flex-wrap gap-2">
                <Input readOnly value={newLink} className="min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" className="gap-1.5" onClick={() => void navigator.clipboard.writeText(newLink).then(() => setCopied(true))}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copié' : 'Copier'}
                </Button>
                <Button variant="outline" className="gap-1.5" asChild>
                  <a href={mailto(newLink)}><Mail className="h-4 w-4" /> Envoyer par email</a>
                </Button>
              </div>
            </div>
          )}

          {acc.links.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {acc.links.map((l) => {
                const expired = l.expires_at && new Date(l.expires_at) < new Date();
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{l.label}{l.email ? <span className="text-muted-foreground"> · {l.email}</span> : null}</p>
                      <p className="text-xs text-muted-foreground">
                        Créé le {fr(l.created_at)} · {l.revoked_at ? `révoqué le ${fr(l.revoked_at)}` : `valable jusqu'au ${fr(l.expires_at)}`}
                        {l.last_access_at ? ` · dernière visite le ${fr(l.last_access_at)}` : ' · jamais ouvert'}
                      </p>
                    </div>
                    {l.revoked_at ? <Badge variant="outline">Révoqué</Badge> : expired ? <Badge variant="outline">Expiré</Badge> : (
                      <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => void acc.revokeLink(l.id).then(() => toast.success('Accès révoqué'))}>
                        <ShieldOff className="h-4 w-4" /> Révoquer
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Réforme de la facturation électronique : vos factures sont déjà en Factur-X. L'envoi par une plateforme agréée (obligatoire pour l'émission à partir du 1er septembre 2027 pour les TPE et PME) viendra par un partenariat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
