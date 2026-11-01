import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildFec, DEFAULT_FEC_ACCOUNTS, fecFileName, type FecAccounts } from "@/lib/fec";
import { downloadBytes } from "@/lib/facturx";
import { fecRows } from "@/lib/invoiceFacturX";
import type { Invoice } from "@/lib/invoices";

const ACCOUNT_KEY = "optiflow-fec-accounts";
function loadAccounts(): Required<FecAccounts> {
  try {
    return { ...DEFAULT_FEC_ACCOUNTS, ...JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "{}") };
  } catch {
    return DEFAULT_FEC_ACCOUNTS;
  }
}

/** Export du FEC des ventes (factures, avoirs, règlements) sur une période. */
export function FecExportDialog({ open, onOpenChange, invoices, siren }: { open: boolean; onOpenChange: (v: boolean) => void; invoices: Invoice[]; siren?: string | null }) {
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [accounts, setAccounts] = useState<Required<FecAccounts>>(loadAccounts);
  const preview = useMemo(() => buildFec(fecRows(invoices), { from, to, accounts }), [invoices, from, to, accounts]);

  const exportFile = () => {
    try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts)); } catch { /* rien */ }
    if (!preview.lines) {
      toast.info("Aucune facture émise sur cette période");
      return;
    }
    downloadBytes(preview.text, fecFileName(siren, to), "text/plain;charset=utf-8");
    toast.success("FEC téléchargé : à transmettre à votre expert-comptable");
  };

  const field = (key: keyof Required<FecAccounts>, label: string) => (
    <label className="block space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input value={accounts[key]} onChange={(e) => setAccounts({ ...accounts, [key]: e.target.value.replace(/\s/g, "") })} className="h-8 font-mono" />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export comptable (FEC)</DialogTitle>
          <DialogDescription>
            Fichier des écritures comptables des ventes au format légal : une écriture par facture ou avoir (journal VE) et par règlement (journal BQ). Les brouillons ne sont pas exportés.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 text-sm"><span>Du</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block space-y-1 text-sm"><span>Au</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {field("client", "Clients (411)")}
          {field("sales", "Transport (706)")}
          {field("fuel", "Indexation gazole")}
          {field("vat", "TVA collectée")}
          {field("bank", "Banque (512)")}
        </div>
        <p className="text-sm text-muted-foreground">
          {preview.lines} ligne(s) d'écriture · total facturé {preview.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} TTC
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={exportFile}><FileDown className="mr-2 h-4 w-4" /> Télécharger le FEC</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
