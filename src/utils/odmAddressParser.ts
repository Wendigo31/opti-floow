/**
 * Parse mission order (ODM) text to extract origin and destination addresses.
 *
 * Typical ODM patterns:
 *   "Départ de LYON à 06h00, livraison MARSEILLE puis TOULON retour dépôt"
 *   "Chargement: Entrepôt PARIS 12 - Livraison: BORDEAUX / TOULOUSE"
 *   "NANTES -> RENNES -> BREST"
 *   "RDV 5h30 base LYON / Livraison GRENOBLE / Retour base"
 *   "Prise en charge LILLE, déchargement STRASBOURG"
 *   "départ garage MONTPELLIER - client PERPIGNAN - retour"
 *   "Base: ROUEN → Client: LE HAVRE → Retour base"
 */

// Common French transport action words that precede or follow a place name
const ACTION_KEYWORDS = [
  'départ', 'depart', 'arrivée', 'arrivee', 'livraison', 'chargement',
  'déchargement', 'dechargement', 'prise en charge', 'retour', 'rdv',
  'base', 'dépôt', 'depot', 'garage', 'entrepôt', 'entrepot',
  'client', 'chez', 'ramasse', 'collecte', 'desserte',
  'passage', 'arrêt', 'arret', 'étape', 'etape', 'stop',
];

// Common French city names (major ones for fallback detection)
const KNOWN_CITIES = [
  'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg',
  'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'le havre',
  'saint-étienne', 'saint-etienne', 'toulon', 'grenoble', 'dijon',
  'angers', 'nîmes', 'nimes', 'villeurbanne', 'le mans', 'aix-en-provence',
  'clermont-ferrand', 'brest', 'tours', 'limoges', 'amiens', 'perpignan',
  'metz', 'besançon', 'besancon', 'orléans', 'orleans', 'rouen', 'mulhouse',
  'caen', 'nancy', 'argenteuil', 'saint-denis', 'montreuil', 'avignon',
  'poitiers', 'versailles', 'pau', 'calais', 'dunkerque', 'valence',
  'colmar', 'troyes', 'béziers', 'beziers', 'ajaccio', 'bastia',
  'bayonne', 'la rochelle', 'lorient', 'saint-malo', 'vannes',
  'auxerre', 'chartres', 'arras', 'tarbes', 'albi', 'chalon-sur-saône',
  'bourg-en-bresse', 'mâcon', 'macon', 'salon-de-provence',
  'saint-quentin', 'laval', 'châteauroux', 'chateauroux', 'bourges',
  'niort', 'agen', 'mont-de-marsan', 'auch', 'dax', 'sète', 'sete',
  'carcassonne', 'narbonne', 'brive', 'tulle', 'périgueux', 'perigueux',
  'angoulême', 'angouleme', 'saintes', 'rochefort', 'cognac',
  'rodez', 'cahors', 'montauban', 'castres', 'mazamet',
  'thionville', 'épinal', 'epinal', 'verdun', 'bar-le-duc',
  'châlons-en-champagne', 'chalons-en-champagne', 'charleville-mézières',
  'charleville-mezieres', 'sedan', 'vitry-le-françois',
  'le creusot', 'montceau-les-mines', 'autun', 'beaune',
  'vichy', 'montluçon', 'montlucon', 'issoire', 'thiers',
  'saint-brieuc', 'lannion', 'quimper', 'morlaix', 'guingamp',
  'cherbourg', 'saint-lô', 'saint-lo', 'lisieux', 'bayeux',
  'évreux', 'evreux', 'elbeuf', 'vernon', 'louviers',
  'abbeville', 'beauvais', 'compiègne', 'compiegne', 'senlis',
  'meaux', 'melun', 'fontainebleau', 'évry', 'evry', 'corbeil',
  'créteil', 'creteil', 'bobigny', 'nanterre', 'boulogne-billancourt',
  'saint-nazaire', 'cholet', 'saumur', 'la-roche-sur-yon',
  'les sables-d\'olonne', 'challans', 'fontenay-le-comte',
];

interface ParsedOdmAddresses {
  origin: string | null;
  destination: string | null;
  /** All intermediate stops found */
  stops: string[];
}

/**
 * Normalize text for comparison: lowercase, remove accents
 */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Extract place names from ODM text.
 * Strategy:
 *   1. Look for UPPERCASED words (typical in French transport ODMs for city names)
 *   2. Look for cities after action keywords ("livraison LYON", "départ PARIS")
 *   3. Match against known French cities
 */
export function parseOdmAddresses(odm: string | null | undefined): ParsedOdmAddresses {
  const result: ParsedOdmAddresses = { origin: null, destination: null, stops: [] };
  if (!odm || odm.trim().length < 3) return result;

  // We collect places in order of appearance in the text.
  // To preserve order, we store { name, position } then sort by position.
  const foundPlaces: { name: string; position: number }[] = [];
  const odmNorm = norm(odm);

  // Strategy 1 (PRIMARY): Check for known city names in the text (case-insensitive)
  // This is the most reliable strategy as it works regardless of case.
  for (const city of KNOWN_CITIES) {
    const cityNorm = norm(city);
    const escapedCity = cityNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedCity}\\b`, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(odmNorm)) !== null) {
      const properCase = city.split(/[\s-]/).map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(city.includes('-') ? '-' : ' ');
      if (!foundPlaces.some(p => norm(p.name) === cityNorm)) {
        foundPlaces.push({ name: properCase, position: match.index });
      }
      break; // only first occurrence matters for ordering
    }
  }

  // Strategy 2: Look for city names after action keywords (case-insensitive)
  let match: RegExpExecArray | null;
  const actionPattern = new RegExp(
    `(?:${ACTION_KEYWORDS.join('|')})\\s*:?\\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\\s'-]{1,30})`,
    'gi'
  );
  while ((match = actionPattern.exec(odm)) !== null) {
    let candidate = match[1].trim();
    // Remove trailing common words that aren't part of the city
    candidate = candidate.replace(/\s+(à|a|de|du|des|le|la|les|puis|et|ou)\s*$/i, '').trim();
    if (candidate.length >= 2 && !foundPlaces.some(p => norm(p.name) === norm(candidate))) {
      // Only add if it looks like a place (not a time or number)
      if (!/^\d/.test(candidate) && !/^[0-9h:]+$/.test(candidate)) {
        foundPlaces.push({ name: candidate, position: match.index });
      }
    }
  }

  // Strategy 3 (BONUS): Find UPPER-CASE sequences (classic ODM style)
  const upperPattern = /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s'-]{1,30})\b/g;
  while ((match = upperPattern.exec(odm)) !== null) {
    const candidate = match[1].trim();
    const skipWords = [
      'RDV', 'ODM', 'OK', 'KM', 'HS', 'AM', 'PM', 'PL', 'VL', 'SPL', 'TP',
      'CDI', 'CDD', 'NB', 'TEL', 'FAX', 'CHAUFFEUR', 'CONDUCTEUR', 'MISSION',
      'ORDRE', 'TRANSPORT', 'LIVRAISON', 'CHARGEMENT', 'RETOUR', 'DEPART',
      'BASE', 'DEPOT', 'GARAGE', 'ENTREPOT', 'CLIENT', 'ALLER',
      'ARRIVEE', 'PASSAGE', 'ETAPE', 'STOP', 'DECHARGEMENT',
      'PRISE', 'CHARGE', 'COLLECTE', 'RAMASSE', 'DESSERTE',
      'ATTENTION', 'URGENT', 'IMPORTANT', 'MERCI', 'APPELER',
      'PRENDRE', 'LAISSER', 'POSER', 'RECUPERER', 'CHARGER',
      'BRIEFE', 'BRIFE', 'BRIEFEE', 'POLYVALENT', 'POLYVALENTE',
      'NUIT', 'JOUR', 'SOIR', 'MATIN', 'LUNDI', 'MARDI', 'MERCREDI',
      'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE',
    ];
    if (candidate.length < 2) continue;
    if (skipWords.includes(candidate.replace(/['-\s]/g, ''))) continue;
    if ((candidate.match(/[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/g) || []).length < 2) continue;
    if (!foundPlaces.some(p => norm(p.name) === norm(candidate))) {
      foundPlaces.push({ name: candidate, position: match.index });
    }
  }

  // Sort by position in text to preserve order of appearance
  foundPlaces.sort((a, b) => a.position - b.position);

  // Deduplicate (already sorted by position)
  const seen = new Set<string>();
  const uniquePlaces: string[] = [];
  for (const p of foundPlaces) {
    const key = norm(p.name);
    if (!seen.has(key) && key.length >= 2) {
      seen.add(key);
      const formatted = p.name.charAt(0).toUpperCase() + p.name.slice(1);
      uniquePlaces.push(formatted);
    }
  }

  if (uniquePlaces.length === 0) return result;

  // First place = origin, last = destination, middle = stops
  result.origin = uniquePlaces[0];
  if (uniquePlaces.length > 1) {
    result.destination = uniquePlaces[uniquePlaces.length - 1];
  }
  if (uniquePlaces.length > 2) {
    result.stops = uniquePlaces.slice(1, -1);
  }

  return result;
}

/**
 * Given a "ligne" text (e.g. "PARIS - LYON") and an ODM text,
 * extract the best origin/destination. Prefers the "ligne" parse,
 * falls back to ODM-derived addresses.
 */
export function extractBestAddresses(
  ligne: string | null | undefined,
  odm: string | null | undefined,
): { origin: string; destination: string; stops: string[] } {
  // First try to parse the ligne
  let origin = '';
  let destination = '';
  let stops: string[] = [];

  if (ligne) {
    const separators = [' - ', ' / ', ' => ', ' -> ', ' → '];
    for (const sep of separators) {
      if (ligne.includes(sep)) {
        const parts = ligne.split(sep).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          origin = parts[0];
          destination = parts[parts.length - 1];
          if (parts.length > 2) {
            stops = parts.slice(1, -1);
          }
          break;
        }
      }
    }
    if (!origin && ligne.trim()) {
      origin = ligne.trim();
    }
  }

  // If we don't have both origin and destination, try ODM
  if ((!origin || !destination) && odm) {
    const odmParsed = parseOdmAddresses(odm);
    if (!origin && odmParsed.origin) origin = odmParsed.origin;
    if (!destination && odmParsed.destination) destination = odmParsed.destination;
    if (stops.length === 0 && odmParsed.stops.length > 0) stops = odmParsed.stops;
  }

  return { origin, destination, stops };
}
