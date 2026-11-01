/**
 * Import Excel / CSV — logique commune aux 3 logiciels (fichier partagé :
 * bridge/shared/import). On lit la première feuille, on rapproche chaque
 * colonne d'un champ connu (par son nom, sans accents ni majuscules), puis on
 * convertit les valeurs (nombres à virgule, dates françaises ou Excel).
 */
export type FieldType = 'text' | 'number' | 'date' | 'email';

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: FieldType;
  /** Autres intitulés de colonne reconnus (« raison sociale », « société »…). */
  aliases?: string[];
  /**
   * Sans intitulé reconnu, retrouver la colonne d'après son contenu :
   * 'text' = colonne surtout de texte, 'number' = colonne surtout de nombres.
   */
  infer?: 'text' | 'number';
}

export type ImportRow = Record<string, string | number | null>;

export const normalize = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Colonne du fichier associée à chaque champ (nom exact de la colonne, ou absent).
 * Par ordre de préférence : intitulé identique, intitulé contenant tous les mots
 * (« Prix HT » pour « prix »), puis mot commençant pareil (« Montants »). Un mot
 * n'est jamais pris à l'intérieur d'un autre (« Prénom » n'est pas « Nom »).
 */
export function autoMap(headers: string[], fields: ImportField[]): Record<string, string | undefined> {
  const used = new Set<string>();
  const map: Record<string, string | undefined> = {};
  const norm = headers.map((h) => ({ h, n: normalize(h), w: normalize(h).split(' ').filter(Boolean) }));
  const score = (x: { n: string; w: string[] }, name: string) => {
    if (!name || !x.n) return 0;
    if (x.n === name) return 3;
    const nw = name.split(' ');
    if (nw.every((t) => x.w.includes(t))) return 2;
    if (nw.length === 1 && name.length > 3 && x.w.some((t) => t.startsWith(name))) return 1;
    return 0;
  };
  for (const f of fields) {
    const names = [f.label, f.key, ...(f.aliases ?? [])].map(normalize);
    let best: { h: string; s: number } | null = null;
    for (const x of norm) {
      if (used.has(x.h)) continue;
      const sc = Math.max(...names.map((n) => score(x, n)));
      if (sc > 0 && (!best || sc > best.s)) best = { h: x.h, s: sc };
    }
    if (best) {
      map[f.key] = best.h;
      used.add(best.h);
    }
  }
  return map;
}

export function parseNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[\s€\u00a0\u202f]/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Date ISO (AAAA-MM-JJ) depuis 31/12/2026, 2026-12-31 ou un numéro de série Excel. */
export function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export interface ConvertResult {
  rows: ImportRow[];
  /** Lignes ignorées (numéro de ligne du fichier, raison). */
  rejected: { line: number; reason: string }[];
}

/** Convertit les lignes lues (objets colonne → valeur) selon le rapprochement choisi. */
export function convertRows(raw: Record<string, unknown>[], map: Record<string, string | undefined>, fields: ImportField[]): ConvertResult {
  const rows: ImportRow[] = [];
  const rejected: ConvertResult['rejected'] = [];
  raw.forEach((r, i) => {
    const line = typeof (r as Record<string, unknown>)[LINE] === 'number' ? ((r as Record<string, unknown>)[LINE] as number) : i + 2; // ligne 1 = en-têtes
    const out: ImportRow = {};
    let empty = true;
    for (const f of fields) {
      const col = map[f.key];
      const v = col ? r[col] : undefined;
      if (v != null && String(v).trim() !== '') empty = false;
      if (f.type === 'number') out[f.key] = parseNumber(v);
      else if (f.type === 'date') out[f.key] = parseDate(v);
      else {
        const s = v == null ? '' : String(v).trim();
        out[f.key] = s === '' ? null : f.type === 'email' ? s.toLowerCase() : s;
      }
    }
    if (empty) return;
    const missing = fields.filter((f) => f.required && (out[f.key] == null || out[f.key] === ''));
    if (missing.length) {
      rejected.push({ line, reason: `${missing.map((f) => f.label).join(', ')} manquant(s)` });
      return;
    }
    const badMail = fields.find((f) => f.type === 'email' && out[f.key] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(out[f.key])));
    if (badMail) out[badMail.key] = null;
    rows.push(out);
  });
  return { rows, rejected };
}

// ---------------------------------------------------------------------------
// Fichiers « libres » : intitulés pas forcément sur la première ligne, titre ou
// lignes vides au-dessus, plusieurs feuilles, voire aucun intitulé.
// ---------------------------------------------------------------------------

export interface SheetData {
  name: string;
  /** Cellules ligne par ligne (première ligne du fichier = index 0). */
  aoa: unknown[][];
}

export interface LocatedTable {
  sheet: string;
  headers: string[];
  rows: Record<string, unknown>[];
  /** Numéro (1 = première ligne) de la ligne d'intitulés, 0 si le fichier n'en a pas. */
  headerLine: number;
  map: Record<string, string | undefined>;
}

/** Numéro de ligne d'origine dans le fichier (propriété non énumérable). */
export const LINE = '__line';

const colLetter = (i: number) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const isBlank = (v: unknown) => v == null || String(v).trim() === '';
const looksNumeric = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && /^[-+]?[\d\s\u00a0\u202f]+([.,]\d+)?\s*(€|eur|euros?)?$/i.test(v.trim()));

/** Ligne de total, sous-total… (à ne pas importer comme un élément). */
const isTotalRow = (cells: unknown[]) => {
  const first = cells.find((c) => !isBlank(c) && !looksNumeric(c));
  return first != null && /^(sous )?(total|totaux)\b/.test(normalize(first));
};

function headerNames(row: unknown[], width: number): string[] {
  const seen = new Map<string, number>();
  return Array.from({ length: width }, (_, i) => {
    let h = isBlank(row[i]) ? `Colonne ${colLetter(i)}` : String(row[i]).replace(/\s+/g, ' ').trim();
    const n = seen.get(h) ?? 0;
    seen.set(h, n + 1);
    if (n) h = `${h} (${n + 1})`;
    return h;
  });
}

function toObjects(aoa: unknown[][], from: number, headers: string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (let i = from; i < aoa.length; i++) {
    const cells = aoa[i] ?? [];
    if (cells.every(isBlank) || isTotalRow(cells)) continue;
    const o: Record<string, unknown> = {};
    headers.forEach((h, j) => { o[h] = cells[j] ?? ''; });
    Object.defineProperty(o, LINE, { value: i + 1, enumerable: false });
    out.push(o);
  }
  return out;
}

/** Complète le rapprochement d'après le contenu des colonnes (champs marqués « infer »). */
export function inferMap(
  headers: string[],
  rows: Record<string, unknown>[],
  fields: ImportField[],
  map: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const out = { ...map };
  const used = new Set(Object.values(out).filter(Boolean) as string[]);
  const sample = rows.slice(0, 50);
  const stats = headers.map((h) => {
    const vals = sample.map((r) => r[h]).filter((v) => !isBlank(v));
    const num = vals.filter(looksNumeric).length;
    return { h, filled: vals.length, numRatio: vals.length ? num / vals.length : 0, distinct: new Set(vals.map(String)).size };
  });
  const ordered = [...fields.filter((f) => f.required), ...fields.filter((f) => !f.required)];
  for (const f of ordered) {
    if (out[f.key] || !f.infer) continue;
    const pick = stats
      .filter((c) => !used.has(c.h) && c.filled > 0 && (f.infer === 'number' ? c.numRatio >= 0.6 : c.numRatio <= 0.4))
      .sort((a, b) => b.filled - a.filled || b.distinct - a.distinct)[0];
    if (pick) {
      out[f.key] = pick.h;
      used.add(pick.h);
    }
  }
  return out;
}

/**
 * Cherche, dans toutes les feuilles, la ligne d'intitulés qui correspond le mieux
 * aux champs attendus (parmi les 25 premières lignes). Sans aucun intitulé
 * reconnu, les colonnes sont nommées « Colonne A, B… » et reconnues d'après
 * leur contenu.
 */
export function locateTable(sheets: SheetData[], fields: ImportField[]): LocatedTable | null {
  let best: { sheet: SheetData; line: number; score: number; width: number } | null = null;
  for (const sheet of sheets) {
    const width = Math.max(0, ...sheet.aoa.slice(0, 200).map((r) => (r ?? []).length));
    if (!width) continue;
    for (let i = 0; i < Math.min(25, sheet.aoa.length); i++) {
      const row = sheet.aoa[i] ?? [];
      if (row.filter((c) => !isBlank(c)).length === 0) continue;
      const hs = row.map((c) => (isBlank(c) || looksNumeric(c) ? '' : String(c)));
      const m = autoMap(hs.filter(Boolean), fields);
      const score = fields.reduce((s, f) => s + (m[f.key] ? (f.required ? 3 : 1) : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { sheet, line: i, score, width };
    }
  }
  if (best) {
    const headers = headerNames(best.sheet.aoa[best.line] ?? [], best.width);
    const rows = toObjects(best.sheet.aoa, best.line + 1, headers);
    const map = inferMap(headers, rows, fields, autoMap(headers, fields));
    return { sheet: best.sheet.name, headers, rows, headerLine: best.line + 1, map };
  }
  // Aucun intitulé reconnu : la feuille la plus remplie, colonnes reconnues par leur contenu.
  const sheet = [...sheets].sort((a, b) => b.aoa.filter((r) => (r ?? []).some((c) => !isBlank(c))).length - a.aoa.filter((r) => (r ?? []).some((c) => !isBlank(c))).length)[0];
  if (!sheet) return null;
  const width = Math.max(0, ...sheet.aoa.map((r) => (r ?? []).length));
  if (!width) return null;
  const headers = headerNames([], width);
  const rows = toObjects(sheet.aoa, 0, headers);
  if (!rows.length) return null;
  return { sheet: sheet.name, headers, rows, headerLine: 0, map: inferMap(headers, rows, fields, {}) };
}
