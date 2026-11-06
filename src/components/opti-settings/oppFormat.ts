/**
 * Format .opp — export des données d'une société, propre aux logiciels Opti
 * (fichier partagé : bridge/shared/settings, copié dans les 3 logiciels).
 *
 *   OPP1                                   ← signature et version du format
 *   {"format":"opp","version":1,…}         ← en-tête lisible (logiciel, société, date,
 *                                             nombre de lignes par table, empreinte)
 *   H4sIAAAAAAAA…                          ← données (JSON compressé gzip, en base64,
 *   …                                        lignes de 76 caractères)
 *
 * L'empreinte SHA-256 porte sur le JSON des données : un fichier modifié ou
 * tronqué est détecté à la lecture. Les secrets (mots de passe, codes PIN,
 * jetons) sont retirés par la base avant l'export.
 */
export const OPP_MAGIC = 'OPP1';
export const OPP_MIME = 'application/x-opti-package';

export interface OppHeader {
  format: 'opp';
  version: 1;
  app: string;
  company: string;
  exported_at: string;
  exported_by?: string;
  encoding: 'gzip+base64' | 'base64';
  sha256: string;
  tables: Record<string, number>;
}

export interface OppExport {
  app: string;
  exported_at: string;
  exported_by?: string;
  company: Record<string, unknown>;
  tables: Record<string, unknown[]>;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const source = new Response(new Uint8Array(bytes)).body as unknown as ReadableStream;
  const res = new Response(source.pipeThrough(stream as unknown as ReadableWritablePair));
  return new Uint8Array(await res.arrayBuffer());
}

const canGzip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Contenu texte du fichier .opp. */
export async function buildOpp(data: OppExport): Promise<string> {
  const json = JSON.stringify(data);
  const gz = canGzip();
  const body = gz ? await pipe(enc.encode(json), new CompressionStream('gzip')) : enc.encode(json);
  const header: OppHeader = {
    format: 'opp',
    version: 1,
    app: data.app,
    company: String(data.company?.company_name ?? data.company?.company_identifier ?? ''),
    exported_at: data.exported_at,
    ...(data.exported_by ? { exported_by: data.exported_by } : {}),
    encoding: gz ? 'gzip+base64' : 'base64',
    sha256: await sha256Hex(json),
    tables: Object.fromEntries(Object.entries(data.tables ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
  };
  const b64 = toBase64(body).replace(/(.{76})/g, '$1\n');
  return `${OPP_MAGIC}\n${JSON.stringify(header)}\n${b64}\n`;
}

/** Relit un fichier .opp et vérifie son empreinte. */
export async function readOpp(text: string): Promise<{ header: OppHeader; data: OppExport }> {
  const [magic, headerLine, ...rest] = text.split('\n');
  if (magic?.trim() !== OPP_MAGIC) throw new Error("Ce fichier n'est pas un export Opti (.opp).");
  const header = JSON.parse(headerLine) as OppHeader;
  const bytes = fromBase64(rest.join(''));
  const raw = header.encoding === 'gzip+base64' ? await pipe(bytes, new DecompressionStream('gzip')) : bytes;
  const json = dec.decode(raw);
  if ((await sha256Hex(json)) !== header.sha256) throw new Error('Fichier .opp modifié ou incomplet (empreinte différente).');
  return { header, data: JSON.parse(json) as OppExport };
}

/** Nom du fichier : <logiciel>-<société>-<date>.opp */
export function oppFileName(app: string, company: string, date = new Date()): string {
  const slug = (company || 'societe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${app}-${slug || 'societe'}-${date.toISOString().slice(0, 10)}.opp`;
}

export function downloadText(text: string, name: string, mime = OPP_MIME) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
