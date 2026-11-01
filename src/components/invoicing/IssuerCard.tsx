import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useLicense } from "@/hooks/useLicense";
import { InvoiceIssuer } from "@/lib/invoices";

interface IssuerCardProps {
  issuer: InvoiceIssuer;
  onSave: (issuer: InvoiceIssuer) => void;
}

export function IssuerCard({ issuer, onSave }: IssuerCardProps) {
  const { licenseData } = useLicense();
  const [form, setForm] = useState<InvoiceIssuer>(issuer);

  useEffect(() => {
    setForm(issuer);
  }, [issuer]);

  const set = <K extends keyof InvoiceIssuer>(key: K, value: InvoiceIssuer[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const prefill = () => {
    setForm((prev) => ({
      ...prev,
      companyName: licenseData?.companyName || prev.companyName,
      siren: licenseData?.siren || prev.siren,
      addressStreet: licenseData?.address || prev.addressStreet,
      addressPostalCode: licenseData?.postalCode || prev.addressPostalCode,
      addressCity: licenseData?.city || prev.addressCity,
      email: licenseData?.email || prev.email,
    }));
    toast.success("Informations de la société reprises");
  };

  const handleSave = () => {
    if (!form.companyName.trim()) {
      toast.error("La raison sociale est obligatoire");
      return;
    }
    onSave(form);
    toast.success("Émetteur enregistré");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Émetteur des factures
            </CardTitle>
            <CardDescription>
              Ces informations apparaissent en en-tête de chaque facture que vous éditez.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={prefill} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Reprendre ma fiche société
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="issuer-name">Raison sociale *</Label>
            <Input
              id="issuer-name"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Transports Dupont"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-form">Forme juridique</Label>
            <Input
              id="issuer-form"
              value={form.legalForm}
              onChange={(e) => set("legalForm", e.target.value)}
              placeholder="SASU"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-siren">SIREN / SIRET</Label>
            <Input
              id="issuer-siren"
              value={form.siren}
              onChange={(e) => set("siren", e.target.value)}
              placeholder="123 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-vat">N° TVA intracommunautaire</Label>
            <Input
              id="issuer-vat"
              value={form.vatNumber}
              onChange={(e) => set("vatNumber", e.target.value)}
              placeholder="FR12345678901"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="issuer-street">Adresse</Label>
            <Input
              id="issuer-street"
              value={form.addressStreet}
              onChange={(e) => set("addressStreet", e.target.value)}
              placeholder="12 rue des Transporteurs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-zip">Code postal</Label>
            <Input
              id="issuer-zip"
              value={form.addressPostalCode}
              onChange={(e) => set("addressPostalCode", e.target.value)}
              placeholder="75011"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-city">Ville</Label>
            <Input
              id="issuer-city"
              value={form.addressCity}
              onChange={(e) => set("addressCity", e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-email">Email</Label>
            <Input
              id="issuer-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-phone">Téléphone</Label>
            <Input
              id="issuer-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-iban">IBAN</Label>
            <Input
              id="issuer-iban"
              value={form.iban}
              onChange={(e) => set("iban", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-bic">BIC</Label>
            <Input id="issuer-bic" value={form.bic} onChange={(e) => set("bic", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer-terms">Délai de paiement (jours)</Label>
            <Input
              id="issuer-terms"
              type="number"
              min={0}
              value={form.paymentTermsDays}
              onChange={(e) => set("paymentTermsDays", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuer-footer">Mentions de bas de facture</Label>
          <Textarea
            id="issuer-footer"
            rows={3}
            value={form.footerNote}
            onChange={(e) => set("footerNote", e.target.value)}
          />
        </div>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer l'émetteur
        </Button>
      </CardContent>
    </Card>
  );
}
