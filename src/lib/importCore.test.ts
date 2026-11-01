import { describe, it, expect } from 'vitest';
import { autoMap, convertRows, parseDate, parseNumber, type ImportField } from './importCore';

const fields: ImportField[] = [
  { key: 'name', label: 'Nom', required: true, aliases: ['raison sociale', 'societe', 'client'] },
  { key: 'email', label: 'Email', type: 'email', aliases: ['e-mail', 'courriel'] },
  { key: 'postal_code', label: 'Code postal', aliases: ['cp'] },
  { key: 'price', label: 'Prix', type: 'number' },
  { key: 'date', label: 'Date', type: 'date' },
];

describe('import Excel / CSV', () => {
  it('rapproche les colonnes malgré accents, majuscules et synonymes', () => {
    const map = autoMap(['Raison Sociale', 'E-mail', 'CP', 'Prix HT', 'Date'], fields);
    expect(map).toMatchObject({ name: 'Raison Sociale', email: 'E-mail', postal_code: 'CP', price: 'Prix HT', date: 'Date' });
  });

  it('convertit nombres et dates françaises, rejette les lignes incomplètes', () => {
    const map = { name: 'Nom', email: 'Email', price: 'Prix', date: 'Date' };
    const { rows, rejected } = convertRows([
      { Nom: 'Carrefour', Email: 'COMPTA@carrefour.fr', Prix: '1 250,50 €', Date: '31/12/2026' },
      { Nom: '', Email: 'x@y.fr' },
      { Nom: 'Leclerc', Email: 'pas-un-mail', Prix: 900, Date: 46387 },
      {},
    ], map, fields);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: 'Carrefour', email: 'compta@carrefour.fr', price: 1250.5, date: '2026-12-31' });
    expect(rows[1].email).toBeNull();
    expect(rejected).toEqual([{ line: 3, reason: 'Nom manquant(s)' }]);
    expect(parseNumber('abc')).toBeNull();
    expect(parseDate('2026-1-5')).toBe('2026-01-05');
  });
});
