/**
 * Import des conducteurs depuis n'importe quel tableau Excel / CSV : les
 * colonnes sont reconnues par leur intitulé (nom, prénom, téléphone, email,
 * contrat, horaire, catégorie de permis, agence d'intérim) ou leur contenu.
 * Seul le nom est obligatoire ; le reste prend les valeurs par défaut.
 */
import { normalize, type ImportField, type ImportRow } from '@/lib/importCore';
import type { ParsedDriverRow } from '@/utils/driversExcelImport';

export const DRIVER_FIELDS: ImportField[] = [
  { key: 'name', label: 'Nom', required: true, infer: 'text', aliases: ['nom prenom', 'nom et prenom', 'conducteur', 'chauffeur', 'nom complet', 'salarie', 'nom de famille', 'collaborateur'] },
  { key: 'first_name', label: 'Prénom', aliases: ['prenom'] },
  { key: 'phone', label: 'Téléphone', aliases: ['tel', 'portable', 'mobile', 'gsm'] },
  { key: 'email', label: 'Email', type: 'email', aliases: ['e-mail', 'courriel', 'mail', 'adresse mail'] },
  { key: 'contract', label: 'Contrat', aliases: ['type de contrat', 'statut', 'cdi cdd'] },
  { key: 'shift', label: 'Horaire', aliases: ['jour nuit', 'type horaire', 'equipe', 'poste'] },
  { key: 'category', label: 'Permis', aliases: ['categorie', 'type de permis', 'vl pl spl', 'categorie permis'] },
  { key: 'agency', label: "Agence d'intérim", aliases: ['agence', 'agence interim', 'societe interim'] },
];

export const DRIVER_TEMPLATE_EXAMPLES: (string | number)[][] = [
  ['Dupont', 'Marc', '06 12 34 56 78', 'marc.dupont@exemple.fr', 'CDI', 'Jour', 'SPL', ''],
  ['Martin', 'Sophie', '06 98 76 54 32', '', 'Intérim', 'Nuit', 'PL', 'Adecco Toulouse'],
];

export const DRIVER_TEMPLATE_HELP = [
  'Nom et prénom peuvent être dans une seule colonne ou deux.',
  'Contrat : CDI, CDD, Intérim ou Joker (CDI si vide). Horaire : Jour ou Nuit (Jour si vide).',
  'Permis : VL, PL, SPL ou TP. Les salaires et primes prennent les valeurs par défaut, à ajuster ensuite.',
  'Les conducteurs déjà présents (même nom) ne sont pas importés une deuxième fois.',
];

const contractOf = (v: unknown): ParsedDriverRow['contractType'] => {
  const t = normalize(v);
  if (/\bcdd\b/.test(t)) return 'cdd';
  if (/interim|tempo/.test(t)) return 'interim';
  if (/joker|remplac/.test(t)) return 'joker';
  return 'cdi';
};
const categoryOf = (v: unknown): ParsedDriverRow['driverCategory'] => {
  const t = normalize(v);
  if (/\bspl\b|super|\bce\b|\bec\b/.test(t)) return 'SPL';
  if (/\bpl\b|poids lourd|\bc\b/.test(t)) return 'PL';
  if (/\btp\b|travaux/.test(t)) return 'TP';
  if (/\bvl\b|leger|\bb\b/.test(t)) return 'VL';
  return undefined;
};

export function toParsedDrivers(rows: ImportRow[]): ParsedDriverRow[] {
  return rows
    .map((r) => {
      const first = String(r.first_name ?? '').trim();
      const last = String(r.name ?? '').trim();
      const name = [first, last].filter(Boolean).join(' ').slice(0, 120);
      return {
        name,
        firstName: first,
        lastName: last,
        phone: r.phone ? String(r.phone) : '',
        email: r.email ? String(r.email) : undefined,
        contractType: contractOf(r.contract),
        shiftType: /nuit|night/.test(normalize(r.shift)) ? 'nuit' : 'jour',
        driverCategory: categoryOf(r.category),
        agencyName: r.agency ? String(r.agency) : undefined,
      } as ParsedDriverRow;
    })
    .filter((d) => d.name);
}
