import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, FileJson, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PUBLIC_PLANS, PUBLIC_PRICE_LABEL, PUBLIC_PRICE_HELPER, PUBLIC_CTA_LABEL } from "@/config/pricingPlans";

/**
 * Internal page — exports the PUBLIC_PLANS configuration as JSON so the
 * team can manually verify the public-facing plan content before each
 * release. Lucide icons are stripped (they are not serializable).
 *
 * Route: /pricing-export (internal, behind authentication)
 */
export default function PricingExport() {
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => {
    const sanitized = {
      generatedAt: new Date().toISOString(),
      constants: {
        PUBLIC_PRICE_LABEL,
        PUBLIC_PRICE_HELPER,
        PUBLIC_CTA_LABEL,
      },
      plans: PUBLIC_PLANS.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        priceLabel: p.priceLabel,
        priceHelper: p.priceHelper,
        ctaLabel: p.ctaLabel,
        popular: !!p.popular,
        bestValue: !!p.bestValue,
        limits: p.limits.map((l) => ({ label: l.label })),
        features: p.features.map((f) => ({
          label: f.label,
          included: f.included,
          highlight: !!f.highlight,
        })),
      })),
    };
    return JSON.stringify(sanitized, null, 2);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success("Configuration copiée dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `public-plans-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export JSON téléchargé");
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileJson className="w-6 h-6 text-primary" />
            Export de la configuration des forfaits publics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Page interne. Permet de vérifier le contenu exact affiché sur les pages
            marketing avant chaque mise en production. Aucun montant ne doit apparaître ici —
            uniquement les libellés publics ("Sur devis", "Nous contacter").
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          Interne
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={handleDownload} variant="default">
          <Download className="w-4 h-4 mr-2" />
          Télécharger en JSON
        </Button>
        <Button onClick={handleCopy} variant="outline">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            public-plans.json — {PUBLIC_PLANS.length} forfait(s)
          </span>
        </div>
        <pre className="p-4 text-xs font-mono text-foreground overflow-auto max-h-[70vh] bg-card">
          {json}
        </pre>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Source : <code>src/config/pricingPlans.ts</code> — single source of truth
        protégée par <code>src/test/marketing-no-prices.test.ts</code>.
      </p>
    </div>
  );
}
