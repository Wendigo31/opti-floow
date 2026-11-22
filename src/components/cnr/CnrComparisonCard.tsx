import { useMemo, useState } from 'react';
import { Scale, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CNR_DEFAULT, compareToCnr, loadCnrReference, saveCnrReference, type CnrOperation, type CnrReference } from '@/lib/cnr';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fr = (d: string) => d.slice(0, 10).split('-').reverse().join('/');

/**
 * Vos prix face au coût de revient de référence du CNR : chaque opération est valorisée avec
 * la formule trinôme (km, heures, journée) et comparée au prix facturé. Composant identique
 * dans OptiFret et OptiFlow.
 */
export function CnrComparisonCard({ operations, licenseId, periodLabel }: { operations: CnrOperation[]; licenseId?: string | null; periodLabel?: string }) {
  const [ref, setRef] = useState<CnrReference>(() => loadCnrReference(licenseId));
  const [edit, setEdit] = useState(false);
  const res = useMemo(() => compareToCnr(ref, operations), [ref, operations]);
  const worst = useMemo(() => [...res.rows].sort((a, b) => a.gap - b.gap).slice(0, 8), [res.rows]);
  const pct = res.cnr > 0 ? (res.gap / res.cnr) * 100 : null;

  const field = (key: 'ck' | 'cc' | 'cj' | 'hoursPerDay', label: string, step: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={ref[key]} onChange={(e) => setRef({ ...ref, [key]: Number(e.target.value) || 0, label: 'Valeurs de la société' })} />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Vos prix face au coût de revient CNR</CardTitle>
            <CardDescription>
              {periodLabel ? `${periodLabel} · ` : ''}{ref.label} : {ref.ck.toLocaleString('fr-FR')} €/km, {ref.cc.toLocaleString('fr-FR')} €/h, {ref.cj.toLocaleString('fr-FR')} €/jour ({ref.hoursPerDay} h).
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEdit((v) => !v)}><Settings2 className="h-4 w-4" /> Référence</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {edit && (
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Valeurs du CNR pour votre activité (régional, porteur, frigo…), à prendre sur cnr.fr. Par défaut : longue distance
              ensemble articulé gazole, décembre 2025.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {field('ck', 'Terme km (€/km, péages compris)', '0.001')}
              {field('cc', 'Terme horaire (€/h)', '0.01')}
              {field('cj', 'Terme journalier (€/jour)', '0.01')}
              {field('hoursPerDay', 'Heures par jour', '0.5')}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { saveCnrReference(ref, licenseId); setEdit(false); }}>Enregistrer</Button>
              <Button size="sm" variant="outline" onClick={() => { setRef(CNR_DEFAULT); saveCnrReference(CNR_DEFAULT, licenseId); }}>Revenir au CNR</Button>
            </div>
          </div>
        )}

        {res.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune opération avec une distance sur la période.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div><p className="text-muted-foreground">Facturé</p><p className="text-lg font-semibold">{eur(res.revenue)}</p></div>
              <div><p className="text-muted-foreground">Coût CNR</p><p className="text-lg font-semibold">{eur(res.cnr)}</p></div>
              <div>
                <p className="text-muted-foreground">Écart</p>
                <p className={`text-lg font-semibold ${res.gap < 0 ? 'text-destructive' : 'text-success'}`}>
                  {res.gap >= 0 ? '+' : ''}{eur(res.gap)}{pct != null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)} %)`}
                </p>
              </div>
              <div><p className="text-muted-foreground">Sous le coût CNR</p><p className="text-lg font-semibold">{res.below} / {res.rows.length}</p></div>
            </div>
            {res.below > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Les prix les plus éloignés du coût CNR</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Opération</TableHead>
                      <TableHead className="text-right">Km</TableHead>
                      <TableHead className="text-right">Facturé</TableHead>
                      <TableHead className="text-right">Coût CNR</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worst.filter((r) => r.gap < 0).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{fr(r.date)}</TableCell>
                        <TableCell className="max-w-56 truncate">{r.label}</TableCell>
                        <TableCell className="text-right">{Math.round(r.km).toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right">{eur(r.revenue)}</TableCell>
                        <TableCell className="text-right">{eur(r.cnrCost)}</TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">{eur(r.gap)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Le CNR est une moyenne nationale : vos coûts réels peuvent être plus bas ou plus hauts. Un prix sous le coût CNR
              est un signal pour renégocier ou vérifier la rentabilité, pas une perte certaine.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
