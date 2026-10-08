import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuotes } from '@/hooks/useQuotes';
import { useClients } from '@/hooks/useClients';
import { useSavedTours } from '@/hooks/useSavedTours';
import { useTourRealCosts } from '@/hooks/useTourRealCosts';
import { computeQuotePrices } from '@/domain/quotes/quotePricing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteCalculator } from '@/components/quotes/QuoteCalculator';

const STATUSES: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Gagné',
  rejected: 'Perdu',
};

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const emptyForm = {
  client_id: '', tour_id: '', origin_address: '', destination_address: '',
  distance_km: 0, total_cost: 0, margin_percent: 15, tva_rate: 20, valid_until: '', notes: '',
};

export default function Tenders() {
  const { quotes, loading, createQuote, updateQuote, deleteQuote } = useQuotes();
  const { clients } = useClients();
  const { tours } = useSavedTours();
  const realCosts = useTourRealCosts(tours);
  const [clientFilter, setClientFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('list');
  const [calcKey, setCalcKey] = useState(0);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? 'Sans client';
  const filtered = useMemo(
    () => quotes.filter((q) => clientFilter === 'all' || q.client_id === clientFilter),
    [quotes, clientFilter]
  );
  const clientTours = tours.filter((t) => !form.client_id || t.client_id === form.client_id);
  const prices = computeQuotePrices(form.total_cost, form.margin_percent, form.tva_rate);

  const pickTour = (id: string) => {
    const tour = tours.find((t) => t.id === id);
    if (!tour) return;
    const cost = realCosts.get(id)?.totalCost ?? Number(tour.total_cost);
    setForm((f) => ({
      ...f, tour_id: id, origin_address: tour.origin_address, destination_address: tour.destination_address,
      distance_km: Number(tour.distance_km), total_cost: Math.round(cost * 100) / 100,
    }));
  };

  const save = async () => {
    const created = await createQuote({
      client_id: form.client_id || null,
      origin_address: form.origin_address,
      destination_address: form.destination_address,
      distance_km: form.distance_km,
      total_cost: form.total_cost,
      margin_percent: form.margin_percent,
      tva_rate: form.tva_rate,
      price_ht: prices.priceHT,
      price_ttc: prices.priceTTC,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      status: 'draft',
      stops: null,
    });
    if (created) { setOpen(false); setForm(emptyForm); }
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="list">Devis</TabsTrigger>
        <TabsTrigger value="calc">Calculateur de devis</TabsTrigger>
      </TabsList>
      <TabsContent value="calc">
        <Card><CardHeader><CardTitle className="text-base">Calculer un devis sans tournée</CardTitle></CardHeader>
          <CardContent><QuoteCalculator key={calcKey} onSaved={() => { setCalcKey((k) => k + 1); setTab('list'); }} /></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="list" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setForm({ ...emptyForm, client_id: clientFilter === 'all' ? '' : clientFilter }); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nouveau devis
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />Aucun devis pour le moment. Créez-en un à partir d'une tournée du client.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((q) => (
            <Card key={q.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{q.quote_number} · {clientName(q.client_id)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{q.origin_address} → {q.destination_address}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => deleteQuote(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="space-x-3">
                  <span>{Math.round(q.distance_km)} km</span>
                  <span>Coût {eur(q.total_cost)}</span>
                  <span className="font-semibold text-foreground">{eur(q.price_ht)} HT</span>
                </div>
                <Select value={q.status ?? 'draft'} onValueChange={(v) => updateQuote(q.id, { status: v })}>
                  <SelectTrigger className="h-8 w-32"><Badge variant="secondary">{STATUSES[q.status ?? 'draft'] ?? q.status}</Badge></SelectTrigger>
                  <SelectContent>{Object.entries(STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau devis</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, tour_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>À partir d'une tournée (coût recalculé)</Label>
              <Select value={form.tour_id} onValueChange={pickTour}>
                <SelectTrigger><SelectValue placeholder={clientTours.length ? 'Choisir une tournée' : 'Aucune tournée pour ce client'} /></SelectTrigger>
                <SelectContent>{clientTours.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Départ</Label><Input value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} /></div>
              <div><Label>Arrivée</Label><Input value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} /></div>
              <div><Label>Distance (km)</Label><Input type="number" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: Number(e.target.value) })} /></div>
              <div><Label>Coût de revient (€)</Label><Input type="number" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: Number(e.target.value) })} /></div>
              <div><Label>Marge (%)</Label><Input type="number" value={form.margin_percent} onChange={(e) => setForm({ ...form, margin_percent: Number(e.target.value) })} /></div>
              <div><Label>TVA (%)</Label><Input type="number" value={form.tva_rate} onChange={(e) => setForm({ ...form, tva_rate: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Valable jusqu'au</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              Prix : <strong>{eur(prices.priceHT)} HT</strong> · {eur(prices.priceTTC)} TTC
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={!form.origin_address || !form.destination_address}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>
    </Tabs>
  );
}
