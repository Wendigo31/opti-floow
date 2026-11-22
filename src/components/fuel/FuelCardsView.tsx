import { useMemo, useRef, useState } from 'react';
import { Fuel, Loader2, Upload, Truck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { normPlate, parseFuelCsv, vehicleFuelStats, type FuelRow } from '@/lib/fuelImport';

const db = () => supabase as any;
const eur = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }));
const num = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: d }));

interface Tx { id: string; vehicle_id: string | null; plate: string | null; occurred_at: string; product: string | null; liters: number | null; amount_ht: number | null; amount_ttc: number | null; station: string | null; mileage: number | null }

/** Véhicule tel que le voit l'écran carburant (chaque logiciel adapte sa flotte). */
export interface FuelVehicle { id: string; name: string; plate: string; planned: number | null }

/** Cartes carburant : import des relevés et consommation / coût réels par véhicule
 *  (repris d'OptiFret, nov. 2026). */
export function FuelCardsView({ licenseId, vehicles, fleetLabel = 'Véhicules', showTitle = true }: { licenseId: string | null | undefined; vehicles: FuelVehicle[]; fleetLabel?: string; showTitle?: boolean }) {
  const license = licenseId ? { id: licenseId } : null;
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ rows: FuelRow[]; errors: number; file: string } | null>(null);
  const [days, setDays] = useState(90);

  const since = useMemo(() => new Date(Date.now() - days * 86_400_000).toISOString(), [days]);
  const { data: tx = [], isLoading, error } = useQuery({
    queryKey: ['fuel-transactions', license?.id, since],
    enabled: !!license?.id,
    queryFn: async (): Promise<Tx[]> => {
      const { data, error } = await db().from('fuel_transactions').select('*').eq('license_id', license!.id).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  const byPlate = useMemo(() => new Map(vehicles.filter((v) => normPlate(v.plate)).map((v) => [normPlate(v.plate), v])), [vehicles]);

  const importRows = useMutation({
    mutationFn: async (rows: FuelRow[]) => {
      const keys = rows.map((r) => r.import_key);
      const existing = new Set<string>();
      for (let i = 0; i < keys.length; i += 300) {
        const { data } = await db().from('fuel_transactions').select('import_key').eq('license_id', license!.id).in('import_key', keys.slice(i, i + 300));
        (data || []).forEach((r: { import_key: string }) => existing.add(r.import_key));
      }
      const fresh = rows.filter((r) => !existing.has(r.import_key)).map((r) => ({
        ...r,
        license_id: license!.id,
        vehicle_id: (r.plate && byPlate.get(r.plate)?.id) || null,
        source: preview?.file || 'import',
      }));
      for (let i = 0; i < fresh.length; i += 200) {
        const { error } = await db().from('fuel_transactions').insert(fresh.slice(i, i + 200));
        if (error) throw new Error(error.message);
      }
      return { added: fresh.length, skipped: rows.length - fresh.length };
    },
    onSuccess: ({ added, skipped }) => {
      toast.success(`${added} transaction(s) importée(s)${skipped ? `, ${skipped} déjà présente(s)` : ''}`);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['fuel-transactions'] });
    },
    onError: (e: Error) => toast.error(`Import impossible : ${e.message}`),
  });

  const onFile = async (file?: File) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    // Les exports des émetteurs sont en UTF-8 ou en Windows-1252
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    const res = parseFuelCsv(text);
    if (!res.rows.length) toast.error('Aucune transaction reconnue : vérifiez que le fichier est un export CSV de votre carte carburant');
    else setPreview({ rows: res.rows, errors: res.errors, file: file.name });
    if (input.current) input.current.value = '';
  };

  const stats = useMemo(() => {
    const groups = new Map<string, Tx[]>();
    for (const t of tx) {
      const k = t.vehicle_id || `plate:${t.plate || '?'}`;
      groups.set(k, [...(groups.get(k) || []), t]);
    }
    return [...groups.entries()].map(([k, list]) => {
      const v = vehicles.find((x) => x.id === k);
      const s = vehicleFuelStats(list);
      const planned = v?.planned || null;
      return { key: k, name: v ? (v.plate && v.plate !== v.name ? `${v.name} · ${v.plate}` : v.name) : `Non rattaché (${list[0].plate || 'sans immatriculation'})`, linked: !!v, planned, ...s };
    }).sort((a, b) => b.amountHt - a.amountHt);
  }, [tx, vehicles]);
  const total = stats.reduce((a, s) => ({ l: a.l + s.liters, ht: a.ht + s.amountHt }), { l: 0, ht: 0 });

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {showTitle ? <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold gradient-text"><Fuel className="h-7 w-7 text-primary" /> Carburant</h1>
            <p className="text-muted-foreground">Importez les relevés de vos cartes carburant (AS24, DKV, Total, Shell, UTA…) : consommation et coût réels de chaque véhicule.</p>
          </div> : <p className="text-sm text-muted-foreground">Importez les relevés de vos cartes carburant (AS24, DKV, Total, Shell, UTA…) : consommation et coût réels de chaque véhicule.</p>}
          <div className="flex gap-2">
            <input ref={input} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button onClick={() => input.current?.click()}><Upload className="mr-2 h-4 w-4" /> Importer un relevé (CSV)</Button>
          </div>
        </div>

        {preview && (
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{preview.rows.length} transaction(s) lue(s) dans {preview.file}</CardTitle>
              <CardDescription>
                {preview.rows.filter((r) => r.plate && byPlate.has(r.plate)).length} rattachée(s) à un véhicule par l'immatriculation
                {preview.errors ? ` · ${preview.errors} ligne(s) ignorée(s)` : ''}. Les transactions déjà importées ne sont pas dupliquées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-64 overflow-auto rounded border">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Immat.</TableHead><TableHead>Station</TableHead><TableHead className="text-right">Litres</TableHead><TableHead className="text-right">HT</TableHead><TableHead className="text-right">Km</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 50).map((r) => (
                      <TableRow key={r.import_key}>
                        <TableCell>{new Date(r.occurred_at).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className={r.plate && byPlate.has(r.plate) ? '' : 'text-warning'}>{r.plate || '—'}</TableCell>
                        <TableCell className="max-w-40 truncate">{r.station || '—'}</TableCell>
                        <TableCell className="text-right">{num(r.liters)}</TableCell>
                        <TableCell className="text-right">{eur(r.amount_ht)}</TableCell>
                        <TableCell className="text-right">{num(r.mileage, 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Annuler</Button>
                <Button onClick={() => importRows.mutate(preview.rows)} disabled={importRows.isPending}>
                  {importRows.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Importer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {[30, 90, 365].map((d) => <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d === 365 ? '12 mois' : `${d} jours`}</Button>)}
          <span className="ml-auto text-sm text-muted-foreground">{num(total.l, 0)} L · {eur(total.ht)} HT</span>
        </div>

        {error ? (
          <p className="text-sm text-destructive">Données carburant indisponibles (mise à jour de la base nécessaire).</p>
        ) : isLoading ? (
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
        ) : stats.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune transaction sur la période. Exportez le relevé de votre carte (espace client AS24, DKV…) au format CSV puis importez-le ici.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stats.map((s) => {
              const over = s.planned && s.litersPer100 ? s.litersPer100 > s.planned * 1.1 : false;
              return (
                <Card key={s.key}>
                  <CardContent className="space-y-3 p-5">
                    <p className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> {s.name}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Gazole</p><p className="font-medium">{num(s.liters, 0)} L</p></div>
                      <div><p className="text-xs text-muted-foreground">Dépense HT</p><p className="font-medium">{eur(s.amountHt)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Prix moyen</p><p className="font-medium">{s.pricePerLiter ? `${s.pricePerLiter.toFixed(3)} €/L` : '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Km parcourus</p><p className="font-medium">{num(s.km, 0)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Conso réelle</p><p className={`font-medium ${over ? 'text-destructive' : ''}`}>{s.litersPer100 ? `${s.litersPer100.toFixed(1)} L/100` : '—'}</p></div>
                      <div><p className="text-xs text-muted-foreground">Gazole au km</p><p className="font-medium">{s.costPerKm ? `${s.costPerKm.toFixed(3)} €` : '—'}</p></div>
                    </div>
                    {s.planned && s.litersPer100 ? (
                      <p className={`flex items-center gap-1 text-xs ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {over && <AlertTriangle className="h-3.5 w-3.5" />} Consommation prévue dans la fiche : {s.planned} L/100 {over ? '— écart de plus de 10 % (conduite, fuite, carte utilisée par un autre véhicule ?)' : ''}
                      </p>
                    ) : !s.km ? <p className="text-xs text-muted-foreground">Kilométrage non relevé à la pompe : consommation non calculable.</p> : null}
                    {!s.linked && <p className="text-xs text-warning">Immatriculation inconnue : ajoutez ce véhicule dans {fleetLabel} (même immatriculation) pour le rattacher aux prochains imports.</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
}
