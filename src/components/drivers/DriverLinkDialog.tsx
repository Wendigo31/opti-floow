import { useEffect, useState } from 'react';
import { Copy, Loader2, MessageSquare, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc(fn, args);

/**
 * Lien personnel de l'application conducteur : le conducteur l'ouvre sur son
 * téléphone (sans mot de passe) pour voir ses tournées du jour, les démarrer,
 * les terminer et noter les palettes échangées.
 */
export function DriverLinkDialog({ driverId, driverName, phone, open, onOpenChange }: {
  driverId: string;
  driverName: string;
  phone?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [link, setLink] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (reset = false) => {
    setBusy(true);
    const { data, error } = await rpc('driver_access_link', { p_driver_id: driverId, p_reset: reset });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message?.includes('Réservé') ? error.message : "Lien conducteur indisponible pour le moment (mise à jour de votre espace en attente).");
      setLink('');
      return;
    }
    setLink(`${window.location.origin}/conducteur?token=${data as string}`);
    // Code pour l'appli OptiGroup Conducteur (stores) : même accès que le lien.
    const p = await rpc('driver_access_pin', { p_driver_id: driverId });
    setPin(!p.error && p.data ? `FL-${p.data as string}` : '');
    if (reset) toast.success('Nouveau lien et nouveau code créés : les anciens ne fonctionnent plus');
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, driverId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Lien copié');
    } catch {
      window.prompt('Lien de l\'application conducteur :', link);
    }
  };
  const sms = `sms:${(phone || '').replace(/\s/g, '')}?&body=${encodeURIComponent(`Bonjour ${driverName}, voici ton appli conducteur OptiFlow (planning, pointage, documents, frais). ${pin ? `Dans l'appli « OptiGroup Conducteur » (App Store / Google Play), saisis le code ${pin}. ` : ''}Ou ouvre ce lien puis « Ajouter à l'écran d'accueil » : ${link}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Application de {driverName}</DialogTitle>
          <DialogDescription>
            Le conducteur installe l'appli « OptiGroup Conducteur » (App Store / Google Play) et saisit son code, ou ouvre ce lien une fois puis « Ajouter à l'écran d'accueil ». Il retrouve : lignes de la semaine, pointage et heures, documents (CMR, bons, photos, signature), pleins, frais, check-list et pannes. Tout remonte dans RH › Remontées conducteurs.
          </DialogDescription>
        </DialogHeader>
        {busy && !link ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Préparation du lien…</p>
        ) : link ? (
          <div className="space-y-3">
            {pin && (
              <div className="rounded-lg border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Code dans l'appli OptiGroup Conducteur</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{pin}</p>
              </div>
            )}
            <Input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Lien de l'application conducteur" />
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" onClick={() => void copy()}><Copy className="h-4 w-4" /> Copier</Button>
              {phone && <Button asChild variant="outline" className="gap-2"><a href={sms}><MessageSquare className="h-4 w-4" /> Envoyer par SMS</a></Button>}
              <Button variant="ghost" className="gap-2" onClick={() => window.confirm("Créer un nouveau lien ? L'ancien ne fonctionnera plus.") && void load(true)} disabled={busy}>
                <RefreshCw className="h-4 w-4" /> Nouveau lien
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Lien ou code perdu, téléphone changé : créez un nouveau lien. L'ancien lien et l'ancien code sont aussitôt désactivés.</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
