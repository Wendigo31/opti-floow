import { useRef, useState } from 'react';
import { Check, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convertRows, locateTable, type ImportField, type ImportRow, type SheetData } from '@/lib/importCore';

const NONE = '__none__';

/**
 * Import Excel / CSV : on dépose le fichier, les colonnes sont reconnues
 * automatiquement (modifiables), un aperçu montre ce qui sera créé, puis on
 * importe. Même écran dans les 3 logiciels. Fichier partagé (bridge/shared/import).
 */
export function DataImportDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  templateName,
  templateExamples,
  templateHelp,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  fields: ImportField[];
  /** Nom du fichier modèle téléchargeable (sans extension). */
  templateName: string;
  /** Lignes d'exemple du modèle (dans l'ordre des champs). */
  templateExamples?: (string | number)[][];
  /** Conseils de remplissage (feuille « Aide » du modèle). */
  templateHelp?: string[];
  /**
   * Crée les éléments ; renvoie le nombre créés et ignorés (doublons…).
   * `ctx.columns` donne l'intitulé de colonne retenu pour chaque champ (indices
   * comme « Montant annuel », « Prix TTC »).
   */
  onImport: (
    rows: ImportRow[],
    ctx: { columns: Record<string, string | undefined> },
  ) => Promise<{ created: number; skipped?: number; errors?: string[] }>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [map, setMap] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [where, setWhere] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ created: number; skipped?: number; errors?: string[] } | null>(null);

  const reset = () => {
    setFileName('');
    setHeaders([]);
    setRaw([]);
    setMap({});
    setWhere('');
    setError(null);
    setDone(null);
    if (input.current) input.current.value = '';
  };

  const read = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      let wb: XLSX.WorkBook;
      if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
        // CSV français : souvent séparé par « ; » et encodé en Windows-1252 (Excel).
        let text = new TextDecoder('utf-8').decode(buf);
        if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buf);
        const first = text.split(/\r?\n/)[0] ?? '';
        const FS = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : (first.match(/\t/g)?.length ?? 0) > 0 ? '\t' : ',';
        wb = XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string', FS, raw: true });
      } else {
        wb = XLSX.read(buf, { type: 'array', cellDates: false });
      }
      // Toutes les feuilles : la ligne d'intitulés est cherchée là où elle est.
      const sheets: SheetData[] = wb.SheetNames.map((name) => ({
        name,
        aoa: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: true }),
      }));
      const t = locateTable(sheets, fields);
      if (!t || !t.rows.length) throw new Error('Aucune donnée trouvée dans ce fichier.');
      setHeaders(t.headers);
      setRaw(t.rows);
      setMap(t.map);
      setWhere(
        (wb.SheetNames.length > 1 ? `feuille « ${t.sheet} », ` : '') +
          (t.headerLine ? `intitulés ligne ${t.headerLine}` : 'sans intitulés : colonnes reconnues par leur contenu'),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lecture du fichier impossible');
    }
  };

  const template = () => {
    const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label), ...(templateExamples ?? [])]);
    ws['!cols'] = fields.map((f, i) => ({
      wch: Math.max(12, f.label.length + 2, ...(templateExamples ?? []).map((r) => String(r[i] ?? '').length + 2)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'À remplir');
    const help = [
      ['Comment remplir ce fichier'],
      [''],
      ['Une ligne par élément. Remplacez les lignes d\'exemple par les vôtres.'],
      ...fields.map((f) => [`${f.label}${f.required ? ' (obligatoire)' : ''}`]),
      [''],
      ...(templateHelp ?? []).map((h) => [h]),
      [''],
      ['Vous pouvez aussi importer votre propre fichier Excel : les colonnes sont reconnues automatiquement.'],
    ];
    const hs = XLSX.utils.aoa_to_sheet(help);
    hs['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, hs, 'Aide');
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  const result = raw.length ? convertRows(raw, map, fields) : null;
  const missingRequired = fields.filter((f) => f.required && !map[f.key]);

  const run = async () => {
    if (!result?.rows.length) return;
    setBusy(true);
    try {
      setDone(await onImport(result.rows, { columns: map }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? 'Votre fichier Excel (.xlsx, .xls) ou CSV, quelle que soit sa forme : les colonnes sont reconnues automatiquement. Vous pouvez aussi partir du modèle.'}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium"><Check className="h-4 w-4 text-emerald-600" /> {done.created} élément(s) importé(s)</p>
            {!!done.skipped && <p className="text-muted-foreground">{done.skipped} ignoré(s) car déjà présent(s).</p>}
            {!!done.errors?.length && <p className="text-destructive">{done.errors.slice(0, 5).join(' · ')}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} aria-label="Fichier à importer" />
              <Button type="button" variant="outline" className="gap-2" onClick={() => input.current?.click()}>
                <Upload className="h-4 w-4" /> Choisir un fichier
              </Button>
              <Button type="button" variant="ghost" className="gap-2" onClick={template}>
                <Download className="h-4 w-4" /> Télécharger le modèle
              </Button>
              {fileName && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><FileSpreadsheet className="h-4 w-4" /> {fileName} · {raw.length} ligne(s){where ? ` · ${where}` : ''}</span>}
            </div>

            {headers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Colonnes reconnues</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.key} className="grid grid-cols-2 items-center gap-2 text-sm">
                      <span>{f.label}{f.required && <span className="text-destructive"> *</span>}</span>
                      <Select value={map[f.key] ?? NONE} onValueChange={(v) => setMap({ ...map, [f.key]: v === NONE ? undefined : v })}>
                        <SelectTrigger className="h-8" aria-label={`Colonne pour ${f.label}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— Ignorer —</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">{result.rows.length}</span> ligne(s) prête(s) à importer
                  {result.rejected.length > 0 && <span className="text-muted-foreground"> · {result.rejected.length} ignorée(s) : {result.rejected.slice(0, 3).map((r) => `ligne ${r.line} (${r.reason})`).join(', ')}{result.rejected.length > 3 ? '…' : ''}</span>}
                </p>
                {result.rows.length > 0 && (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>{fields.filter((f) => map[f.key]).map((f) => <th key={f.key} className="px-2 py-1.5 text-left font-medium">{f.label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t">{fields.filter((f) => map[f.key]).map((f) => <td key={f.key} className="px-2 py-1">{r[f.key] ?? '—'}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {missingRequired.length > 0 && headers.length > 0 && (
              <p className="text-sm text-destructive">Colonne obligatoire à associer : {missingRequired.map((f) => f.label).join(', ')}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {done ? (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
              <Button onClick={() => void run()} disabled={busy || !result?.rows.length || missingRequired.length > 0} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importer {result?.rows.length ? `(${result.rows.length})` : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
