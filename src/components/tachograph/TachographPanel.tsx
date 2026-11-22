import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { checkRules, hm, parseDriverCard, type TachoAlert, type TachoCard } from '@/lib/tachograph';

interface Loaded { file: string; card: TachoCard; alerts: TachoAlert[] }

const fr = (d: string) => d.split('-').reverse().join('/');

/**
 * Chronotachygraphe : lecture des fichiers de carte conducteur (.ddd) téléchargés avec un lecteur
 * de carte, pour voir les temps de conduite, de travail et de repos jour par jour et les infractions
 * probables au règlement 561/2006. Rien n'est envoyé sur internet : le fichier est lu dans le navigateur.
 * Composant identique dans OptiFret et OptiFlow.
 */
export function TachographPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [current, setCurrent] = useState(0);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: Loaded[] = [];
    for (const f of Array.from(files)) {
      try {
        const card = parseDriverCard(await f.arrayBuffer());
        next.push({ file: f.name, card, alerts: checkRules(card.days) });
      } catch (e) {
        toast.error(`${f.name} : ${(e as Error).message}`);
      }
    }
    if (next.length) {
      setLoaded((prev) => [...next, ...prev]);
      setCurrent(0);
      toast.success(`${next.length} fichier(s) lu(s)`);
    }
  };

  const sel = loaded[current];
  const days = sel ? [...sel.card.days].reverse() : [];
  const total = (k: 'driving' | 'work' | 'availability') => sel?.card.days.reduce((s, d) => s + d.minutes[k], 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="h-6 w-6 text-primary" /> Chronotachygraphe</h1>
          <p className="text-sm text-muted-foreground">
            Ouvrez les fichiers de carte conducteur (.ddd, .C1B) : temps de conduite, de travail et de repos jour par jour,
            et infractions probables. Le fichier est lu sur cet ordinateur, rien n'est envoyé.
          </p>
        </div>
        <div>
          <input ref={input} type="file" accept=".ddd,.DDD,.c1b,.C1B,.tgd,.TGD,.esm,.ESM,.v1b,.V1B" multiple className="sr-only"
            onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
          <Button className="gap-2" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" /> Ouvrir des fichiers .ddd</Button>
        </div>
      </div>

      {!loaded.length && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
            <p>Téléchargez la carte du conducteur avec votre lecteur (TachoDrive, Optac, lecteur USB…) puis ouvrez le fichier ici.</p>
            <p>Les fichiers de l'appareil du véhicule (mémoire de masse) ne sont pas encore lus : seulement les cartes conducteur.</p>
          </CardContent>
        </Card>
      )}

      {loaded.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {loaded.map((l, i) => (
            <Button key={`${l.file}-${i}`} size="sm" variant={i === current ? 'default' : 'outline'} onClick={() => setCurrent(i)}>
              {[l.card.firstNames, l.card.surname].filter(Boolean).join(' ') || l.file}
            </Button>
          ))}
        </div>
      )}

      {sel && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{[sel.card.firstNames, sel.card.surname].filter(Boolean).join(' ') || 'Conducteur'}</CardTitle>
              <CardDescription>
                Carte {sel.card.cardNumber ?? 'inconnue'} · {sel.card.days.length} jour(s)
                {sel.card.days.length > 0 && ` du ${fr(sel.card.days[0].date)} au ${fr(sel.card.days[sel.card.days.length - 1].date)}`}
                {' · '}{sel.file}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div><p className="text-muted-foreground">Conduite</p><p className="text-lg font-semibold">{hm(total('driving'))}</p></div>
              <div><p className="text-muted-foreground">Autres travaux</p><p className="text-lg font-semibold">{hm(total('work'))}</p></div>
              <div><p className="text-muted-foreground">Disponibilité</p><p className="text-lg font-semibold">{hm(total('availability'))}</p></div>
              <div><p className="text-muted-foreground">Distance</p><p className="text-lg font-semibold">{sel.card.days.reduce((s, d) => s + d.distanceKm, 0).toLocaleString('fr-FR')} km</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {sel.alerts.some((a) => a.level === 'infraction') ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                Contrôle de la réglementation ({sel.alerts.length})
              </CardTitle>
              <CardDescription>Règlement (CE) 561/2006. À confirmer avec un logiciel d'analyse agréé en cas de contrôle.</CardDescription>
            </CardHeader>
            <CardContent>
              {sel.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune infraction détectée sur la période.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {sel.alerts.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <Badge variant={a.level === 'infraction' ? 'destructive' : 'outline'} className="shrink-0">{a.level === 'infraction' ? 'Infraction' : 'À surveiller'}</Badge>
                      <span><span className="font-medium">{fr(a.date)}</span> · {a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jour</TableHead>
                    <TableHead className="text-right">Conduite</TableHead>
                    <TableHead className="text-right">Conduite continue max</TableHead>
                    <TableHead className="text-right">Travail</TableHead>
                    <TableHead className="text-right">Disponibilité</TableHead>
                    <TableHead className="text-right">Repos</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{new Date(`${d.date}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                      <TableCell className={`text-right ${d.minutes.driving > 9 * 60 ? 'text-destructive font-medium' : ''}`}>{hm(d.minutes.driving)}</TableCell>
                      <TableCell className={`text-right ${d.longestContinuousDriving > 270 ? 'text-destructive font-medium' : ''}`}>{hm(d.longestContinuousDriving)}</TableCell>
                      <TableCell className="text-right">{hm(d.minutes.work)}</TableCell>
                      <TableCell className="text-right">{hm(d.minutes.availability)}</TableCell>
                      <TableCell className="text-right">{hm(d.minutes.rest)}</TableCell>
                      <TableCell className="text-right">{d.distanceKm.toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
