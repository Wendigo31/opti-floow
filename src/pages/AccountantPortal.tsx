import { useEffect, useState } from 'react';
import { Download, FolderArchive, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

/**
 * Espace expert-comptable (page publique, lien personnel #t=<jeton>) : dossiers
 * comptables mensuels de la société, en lecture seule. Le jeton reste dans le
 * fragment # de l'adresse (jamais envoyé au serveur web), seulement à la base.
 * Fichier partagé (bridge/shared/accounting).
 */
interface PortalData {
  company: string;
  label: string;
  expires_at: string | null;
  exports: { period: string; created_at: string; size: number; contents: { label: string; count: number }[] | null; url: string }[];
}

const monthLabel = (p: string) => new Date(`${p}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

export default function AccountantPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
    if (!token) { setError('Lien incomplet : demandez un nouveau lien à votre client.'); return; }
    // Fonction de la base (sans Edge Function) : vérifie le jeton et renvoie les dossiers.
    const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    void rpc.call(supabase, 'accountant_portal', { p_token: token }).then(({ data: d, error: e }) => {
      if (e || !d || (d as { error?: string }).error) setError((d as { error?: string })?.error || 'Lien invalide, expiré ou révoqué. Demandez un nouveau lien à votre client.');
      else setData(d as PortalData);
    });
  }, []);

  return (
    <div className="min-h-dvh bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {error ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderArchive className="h-5 w-5" /> Dossiers comptables — {data.company}</CardTitle>
              <CardDescription>
                Accès {data.label} en lecture seule{data.expires_at ? `, valable jusqu'au ${new Date(data.expires_at).toLocaleDateString('fr-FR')}` : ''}.
                Chaque dossier contient les factures et avoirs Factur-X, le FEC des ventes, les fiches de paie validées et les récapitulatifs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.exports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun dossier pour l'instant : votre client ne l'a pas encore préparé.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data.exports.map((e) => (
                    <li key={e.period} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{monthLabel(e.period)}</p>
                        <p className="text-xs text-muted-foreground">
                          Préparé le {new Date(e.created_at).toLocaleDateString('fr-FR')}
                          {e.contents?.length ? ` · ${e.contents.map((c) => `${c.count} ${c.label}`).join(', ')}` : ''}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" asChild>
                        <a href={e.url} download><Download className="h-4 w-4" /> Télécharger</a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
