import jsPDF from 'jspdf';

// Les montants formatés en fr-FR contiennent des espaces insécables (U+202F, U+00A0)
// que les polices standard de jsPDF affichent mal (« 1 /020,00 € »), et la flèche « → »
// n'existe pas dans ces polices (« !' »). On nettoie tous les textes écrits dans un PDF.
//
// Depuis jsPDF 4, text() & co. sont des propriétés propres à chaque document : modifier
// jsPDF.API ne suffit plus. On passe donc par l'événement « initialized », déclenché à la
// création de chaque document, pour envelopper ses méthodes.
// Fichier partagé (bridge/shared/pdf) — le même dans OptiFret, OptiFlow et OptiXpress.
const GLYPHS: Record<string, string> = { '→': '->', '←': '<-', '⇒': '=>', '≤': '<=', '≥': '>=', ' ': ' ' };
export const cleanPdfText = (v: unknown): unknown =>
  typeof v === 'string'
    ? v.replace(/[  ]/g, ' ').replace(/[→←⇒≤≥ ]/g, (c) => GLYPHS[c] ?? c)
    : Array.isArray(v) ? v.map(cleanPdfText) : v;

type Doc = Record<string, unknown>;
const METHODS = ['text', 'splitTextToSize', 'getTextWidth', 'getStringUnitWidth'];
function wrap(doc: Doc) {
  for (const name of METHODS) {
    const original = doc[name] as ((...a: unknown[]) => unknown) & { __fr?: boolean };
    if (typeof original !== 'function' || original.__fr) continue;
    const wrapped = function (this: unknown, first: unknown, ...rest: unknown[]) {
      return original.call(this, cleanPdfText(first), ...rest);
    } as typeof original;
    wrapped.__fr = true;
    doc[name] = wrapped;
  }
}

const api = (jsPDF as unknown as { API: Record<string, any> }).API;
if (api && !api.__frenchSpacesPatched) {
  // Anciennes versions : méthodes sur le prototype.
  wrap(api);
  // jsPDF ≥ 3 : méthodes propres à chaque document.
  if (Array.isArray(api.events)) api.events.push(['initialized', function (this: Doc) { wrap(this); }]);
  api.__frenchSpacesPatched = true;
}
