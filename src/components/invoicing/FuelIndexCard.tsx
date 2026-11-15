import { useQueryClient } from "@tanstack/react-query";
import { useDieselPrice } from "@/hooks/useDieselPrice";
import { useEffect, useState } from "react";
import { Fuel, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatEuro } from "@/lib/invoices";
import { fuelSurcharge, type FuelIndexSettings } from "@/lib/fuelIndex";

/**
 * Indexation gazole (obligatoire dans les contrats de transport, art. L3222-1
 * du Code des transports) : réglage commun à la société, appliqué ensuite à
 * chaque facture par le bouton « Indexation gazole » du formulaire.
 */
export function FuelIndexCard({ value, onSave }: { value: FuelIndexSettings; onSave: (v: FuelIndexSettings) => void }) {
  const [form, setForm] = useState(value);
  const diesel = useDieselPrice();
  const qc = useQueryClient();
  useEffect(() => setForm(value), [value]);
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const example = fuelSurcharge(1000, { ...form, enabled: true });

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Indexation gazole
            </CardTitle>
            <CardDescription>
              Répercute la variation du gazole sur vos factures, selon l'indice publié chaque mois par le CNR (cnr.fr).
            </CardDescription>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            aria-label="Activer l'indexation gazole"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Prix officiel du jour (HT)</Label>
            <p className="h-10 rounded-md border bg-muted/40 px-3 py-2 text-sm">{diesel.officialHT != null ? `${diesel.officialHT.toFixed(3)} €/L` : "—"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fuel-adjust">Votre ajustement (+ ou −, €/L)</Label>
            <Input id="fuel-adjust" inputMode="decimal" value={form.priceAdjust ?? 0} onChange={(e) => setForm({ ...form, priceAdjust: num(e.target.value) ?? 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Prix utilisé dans vos calculs</Label>
            <p className="h-10 rounded-md border bg-primary/5 px-3 py-2 text-sm font-semibold">{diesel.officialHT != null ? `${Math.max(0, diesel.officialHT + (Number(form.priceAdjust) || 0)).toFixed(3)} €/L HT` : "—"}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Le prix moyen national HT est relevé automatiquement. Ajoutez ou retirez la différence avec votre prix réel (remboursement de taxe sur le gazole, remise carte carburant, cuve…) : elle s'applique au calculateur et à vos coûts.</p>
      </CardContent>
      {form.enabled && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="fuel-share">Part du gazole dans le prix (%)</Label>
              <Input id="fuel-share" inputMode="decimal" value={form.sharePct} onChange={(e) => setForm({ ...form, sharePct: num(e.target.value) ?? 25 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fuel-ref">Indice de référence (contrat)</Label>
              <Input id="fuel-ref" inputMode="decimal" value={form.refIndex ?? ""} onChange={(e) => setForm({ ...form, refIndex: num(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fuel-cur">Indice du mois</Label>
              <Input id="fuel-cur" inputMode="decimal" value={form.currentIndex ?? ""} onChange={(e) => setForm({ ...form, currentIndex: num(e.target.value) })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {form.refIndex && form.currentIndex
              ? `Exemple : pour 1 000 € HT de transport, l'indexation ajoute ${formatEuro(example)} HT.`
              : "Saisissez l'indice du contrat et celui du mois pour calculer l'indexation."}
          </p>
        </CardContent>
      )}
      <CardContent className={form.enabled ? "pt-0" : ""}>
        <Button
          className="gap-2"
          onClick={() => {
            onSave(form);
            qc.invalidateQueries({ queryKey: ["diesel-adjust"] });
            toast.success("Gazole enregistré");
          }}
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
