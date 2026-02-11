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

  const places: string[] = [];

  // Strategy 1: Find UPPER-CASE sequences of 2+ characters (likely city names)
  // E.g. "LYON", "SAINT-ETIENNE", "LE HAVRE"
  const upperPattern = /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s'-]{1,30})\b/g;
  let match: RegExpExecArray | null;
  while ((match = upperPattern.exec(odm)) !== null) {
    const candidate = match[1].trim();
    // Filter out common non-city uppercase words
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
    // Must have at least 2 letter characters
    if ((candidate.match(/[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/g) || []).length < 2) continue;
    places.push(candidate);
  }

  // Strategy 2: Look for city names after action keywords
  const actionPattern = new RegExp(
    `(?:${ACTION_KEYWORDS.join('|')})\\s*:?\\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇa-zàâäéèêëïîôùûüÿç][A-Za-zÀ-ÿ\\s'-]{1,30})`,
    'gi'
  );
  while ((match = actionPattern.exec(odm)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length >= 2 && !places.some(p => norm(p) === norm(candidate))) {
      places.push(candidate);
    }
  }

  // Strategy 3: Check for known city names in the text
  const odmLower = norm(odm);
  for (const city of KNOWN_CITIES) {
    const cityNorm = norm(city);
    // Word boundary check
    const regex = new RegExp(`\\b${cityNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (regex.test(odmLower)) {
      const properCase = city.split(/[\s-]/).map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(city.includes('-') ? '-' : ' ');
      if (!places.some(p => norm(p) === cityNorm)) {
        places.push(properCase);
      }
    }
  }

  // Deduplicate and order
  const seen = new Set<string>();
  const uniquePlaces: string[] = [];
  for (const p of places) {
    const key = norm(p);
    if (!seen.has(key) && key.length >= 2) {
      seen.add(key);
      // Title-case for consistency
      const formatted = p.charAt(0).toUpperCase() + p.slice(1);
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
