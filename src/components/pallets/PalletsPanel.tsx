import { useMemo, useState } from 'react';
import { Boxes, Download, Plus, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePallets } from '@/hooks/usePallets';
import { PalletMovementDialog } from '@/components/pallets/PalletMovementDialog';
import { balanceText, palletBalances } from '@/lib/pallets';

const ALL = '__all__';
const fr = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : '—');

/**
 * Palettes échangées avec les clients : soldes, historique, saisie et export Excel.
 * Même écran dans les 3 logiciels. Fichier partagé (bridge/shared/pallets).
 */
export function PalletsPanel({ licenseId, clients }: { licenseId: string | null | undefined; clients: { id: string; name: string }[] }) {
  const p = usePallets(licenseId);
  const nameOf = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const [filter, setFilter] = useState(ALL);
  const [open, setOpen] = useState(false);

  const balances = palletBalances(p.moves);
  const rows = p.moves.filter((m) => filter === ALL || m.client_id === filter);
  const owed = balances.filter((b) => b.total > 0).reduce((s, b) => s + b.total, 0);
  const due = balances.filter((b) => b.total < 0).reduce((s, b) => s - b.total, 0);

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
          <Button className="gap-2" onClick={() => setOpen(true)} disabled={!p.available || !clients.length}><Plus className="h-4 w-4" /> Échange de palettes</Button>
        </div>
      </div>
      {!p.available && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">La gestion des palettes sera disponible après la prochaine mise à jour de votre espace.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Palettes dues par vos clients</p><p className="text-2xl font-bold text-amber-600">{owed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Palettes que vous devez</p><p className="text-2xl font-bold">{due}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Clients avec un solde</p><p className="text-2xl font-bold">{balances.filter((b) => b.total !== 0).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Soldes par client</CardTitle>
          <CardDescription>Cliquez sur un client pour voir ses échanges.</CardDescription>
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
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
        onOpenChange={setOpen}
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
