import { clientLabel } from '@/lib/clientLabel';
import { useMemo, useState } from 'react';
import { Boxes, Download, Plus, Smartphone, Trash2, Warehouse, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePallets, usePalletStock } from '@/hooks/usePallets';
import { PalletMovementDialog } from '@/components/pallets/PalletMovementDialog';
import { PALLET_TYPES, balanceText, palletBalances } from '@/lib/pallets';

const ALL = '__all__';
const fr = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : '—');

/**
 * Palettes échangées avec les clients : soldes, historique, saisie et export Excel.
 * Même écran dans les 3 logiciels. Fichier partagé (bridge/shared/pallets).
 */
export function PalletsPanel({ licenseId, clients }: { licenseId: string | null | undefined; clients: { id: string; name: string }[] }) {
  const p = usePallets(licenseId);
  const nameOf = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const st = usePalletStock(licenseId);
  const [filter, setFilter] = useState(ALL);
  const [side, setSide] = useState<'all' | 'dues' | 'rendre'>('all');
  const [open, setOpen] = useState(false);
  const [dispatchType, setDispatchType] = useState<string | undefined>();

  const allBalances = palletBalances(p.moves);
  // Filtre « Dûes » (les clients nous doivent) / « À rendre » (nous devons au client)
  const balances = allBalances.filter((b) => side === 'all' || (side === 'dues' ? b.total > 0 : b.total < 0));
  const sideClients = new Set(balances.map((b) => b.clientId));
  const rows = p.moves.filter((m) => (filter === ALL || m.client_id === filter) && (side === 'all' || sideClients.has(m.client_id)));
  // Stock : palettes possédées, chez les clients (dues), à rendre, et au dépôt (possédées − chez les clients + à rendre)
  const types = Array.from(new Set([...PALLET_TYPES, ...Object.keys(st.stock), ...p.moves.map((m) => m.pallet_type)]));
  const stockRows = types.map((t) => {
    const owned = st.stock[t] ?? 0;
    let out = 0;
    let toReturn = 0;
    for (const b of allBalances) {
      const n = b.byType[t] ?? 0;
      if (n > 0) out += n;
      else toReturn -= n;
    }
    return { type: t, owned, out, toReturn, depot: owned - out + toReturn };
  }).filter((r) => r.owned || r.out || r.toReturn || (PALLET_TYPES as readonly string[]).includes(r.type));
  const owed = allBalances.filter((b) => b.total > 0).reduce((s, b) => s + b.total, 0);
  const due = allBalances.filter((b) => b.total < 0).reduce((s, b) => s - b.total, 0);
  const ownedTotal = stockRows.reduce((s, r) => s + r.owned, 0);
  const depotTotal = stockRows.reduce((s, r) => s + r.depot, 0);

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(balances.map((b) => ({
      Client: nameOf.get(b.clientId) ?? b.clientId,
      Solde: b.total,
      Détail: Object.entries(b.byType).filter(([, n]) => n).map(([t, n]) => `${t} : ${n}`).join(', '),
      'Dernier échange': fr(b.lastDate),
    }))), 'Soldes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(p.moves.map((m) => ({
      Date: fr(m.movement_date), Client: nameOf.get(m.client_id) ?? m.client_id, Lieu: m.site ?? '', Type: m.pallet_type,
      Laissées: m.given, Récupérées: m.returned, Référence: m.reference ?? '', Saisie: m.source === 'conducteur' ? 'Conducteur' : 'Bureau', Remarque: m.note ?? '',
    }))), 'Échanges');
    XLSX.writeFile(wb, `palettes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Boxes className="h-6 w-6 text-primary" /> Palettes</h1>
          <p className="text-sm text-muted-foreground">Palettes laissées chez vos clients et récupérées, avec le solde de chacun.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportXlsx} disabled={!p.moves.length}><Download className="h-4 w-4" /> Exporter</Button>
          <Button className="gap-2" onClick={() => { setDispatchType(undefined); setOpen(true); }} disabled={!p.available || !clients.length}><Plus className="h-4 w-4" /> Échange de palettes</Button>
        </div>
      </div>
      {!p.available && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">La gestion des palettes sera disponible après la prochaine mise à jour de votre espace.</p>}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock de la société</p><p className="text-2xl font-bold">{ownedTotal}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Au dépôt</p><p className={`text-2xl font-bold ${depotTotal < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{depotTotal}</p></CardContent></Card>
        <Card className="cursor-pointer" onClick={() => setSide('dues')}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dûes par vos clients</p><p className="text-2xl font-bold text-amber-600">{owed}</p></CardContent></Card>
        <Card className="cursor-pointer" onClick={() => setSide('rendre')}><CardContent className="p-4"><p className="text-xs text-muted-foreground">À rendre</p><p className="text-2xl font-bold text-sky-600">{due}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Warehouse className="h-4 w-4 text-primary" /> Stock de palettes</CardTitle>
          <CardDescription>Saisissez le nombre de palettes que possède la société ; le dépôt se calcule avec les échanges. « Dispatcher » envoie des palettes du stock chez un client.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {!st.available ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Le stock sera disponible après la prochaine mise à jour de votre espace.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="w-32">Possédées</TableHead><TableHead className="text-right">Chez les clients</TableHead><TableHead className="text-right">À rendre</TableHead><TableHead className="text-right">Au dépôt</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {stockRows.map((r) => (
                  <TableRow key={r.type}>
                    <TableCell className="font-medium">{r.type}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="h-8 w-24"
                        aria-label={`Palettes ${r.type} possédées`}
                        defaultValue={r.owned}
                        key={`${r.type}-${r.owned}`}
                        onBlur={(e) => {
                          const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          if (v !== r.owned) void st.set(r.type, v).then(() => toast.success(`Stock ${r.type} : ${v}`)).catch((err) => toast.error((err as Error).message));
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right text-amber-600">{r.out || '—'}</TableCell>
                    <TableCell className="text-right text-sky-600">{r.toReturn || '—'}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.depot < 0 ? 'text-destructive' : ''}`}>{r.depot}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1" disabled={!clients.length || !p.available} onClick={() => { setDispatchType(r.type); setOpen(true); }}>
                        <Send className="h-3.5 w-3.5" /> Dispatcher
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Soldes par client</CardTitle>
            <CardDescription>Cliquez sur un client pour voir ses échanges.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer les soldes">
            {([['all', 'Tous'], ['dues', 'Dûes'], ['rendre', 'À rendre']] as const).map(([v, l]) => (
              <Button key={v} size="sm" variant={side === v ? 'default' : 'outline'} onClick={() => setSide(v)}>{l}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!balances.length ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{p.loading ? 'Chargement…' : 'Aucun échange de palettes pour l\'instant.'}</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Par type</TableHead><TableHead className="hidden sm:table-cell">Dernier échange</TableHead><TableHead>Solde</TableHead></TableRow></TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.clientId} className="cursor-pointer" onClick={() => setFilter(b.clientId)}>
                    <TableCell className="font-medium">{nameOf.get(b.clientId) ?? 'Client supprimé'}</TableCell>
                    <TableCell className="text-muted-foreground">{Object.entries(b.byType).filter(([, n]) => n).map(([t, n]) => `${t} ${n > 0 ? '+' : ''}${n}`).join(' · ') || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{fr(b.lastDate)}</TableCell>
                    <TableCell>
                      <Badge className={b.total > 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : b.total < 0 ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-muted text-muted-foreground'}>{balanceText(b.total)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Échanges</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56" aria-label="Filtrer par client"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les clients</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{clientLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Laissées</TableHead><TableHead className="text-right">Récupérées</TableHead><TableHead className="hidden md:table-cell">Lieu / référence</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {!rows.length ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Aucun échange.</TableCell></TableRow>
              ) : rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{fr(m.movement_date)}{m.source === 'conducteur' && <Smartphone className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" aria-label="Saisi par le conducteur" />}</TableCell>
                  <TableCell>{nameOf.get(m.client_id) ?? '—'}</TableCell>
                  <TableCell>{m.pallet_type}</TableCell>
                  <TableCell className="text-right">{m.given || '—'}</TableCell>
                  <TableCell className="text-right">{m.returned || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{[m.site, m.reference, m.note].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" aria-label="Supprimer l'échange" onClick={() => window.confirm('Supprimer cet échange ?') && void p.remove(m.id).catch((e) => toast.error((e as Error).message))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PalletMovementDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setDispatchType(undefined); }}
        defaultPalletType={dispatchType}
        clients={clients}
        defaultClientId={filter === ALL ? undefined : filter}
        onSave={async (m) => {
          await p.add(m);
          toast.success('Échange de palettes enregistré');
        }}
      />
    </div>
  );
}
