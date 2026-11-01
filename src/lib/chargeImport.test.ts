import { describe, it, expect } from 'vitest';
import { locateTable } from './importCore';
import { CHARGE_FIELDS, toCharges } from './chargeImport';
import { convertRows } from './importCore';

const run = (aoa: unknown[][]) => {
  const t = locateTable([{ name: 'Feuil1', aoa }], CHARGE_FIELDS)!;
  return { t, charges: toCharges(convertRows(t.rows, t.map, CHARGE_FIELDS).rows, t.map) };
};

describe('import des charges depuis un Excel libre', () => {
  it('trouve les intitulés sous un titre et lit périodicité, HT/TTC et catégorie', () => {
    const { t, charges } = run([
      ['Mes frais 2026'],
      [],
      ['Libellé', 'Coût annuel TTC', 'Remarque'],
      ['Assurance flotte', '4 200,00 €', ''],
      ['Loyer dépôt', 18000, 'payé chaque mois'],
      ['Total', 22200, ''],
    ]);
    expect(t.headerLine).toBe(3);
    expect(charges).toEqual([
      { name: 'Assurance flotte', amount: 4200, period: 'yearly', taxMode: 'ttc', kind: 'insurance' },
      { name: 'Loyer dépôt', amount: 18000, period: 'yearly', taxMode: 'ttc', kind: 'office' },
    ]);
  });

  it('colonnes dédiées : trimestriel ramené au mois, HT par défaut', () => {
    const { charges } = run([
      ['Nom', 'Montant', 'Fréquence', 'Type'],
      ['Entretien camions', 900, 'Trimestriel', 'Entretien'],
      ['Leasing tracteur', 1850, 'mensuel', ''],
      ['Ligne vide', '', '', ''],
    ]);
    expect(charges).toEqual([
      { name: 'Entretien camions', amount: 300, period: 'monthly', taxMode: 'ht', kind: 'maintenance' },
      { name: 'Leasing tracteur', amount: 1850, period: 'monthly', taxMode: 'ht', kind: 'leasing' },
    ]);
  });

  it('sans aucun intitulé : texte = nom, nombre = montant', () => {
    const { t, charges } = run([
      ['Expert comptable', 350],
      ['Assurance annuelle', 2400],
    ]);
    expect(t.headerLine).toBe(0);
    expect(charges.map((c) => [c.name, c.amount, c.period])).toEqual([
      ['Expert comptable', 350, 'monthly'],
      ['Assurance annuelle', 2400, 'yearly'],
    ]);
  });

  it('choisit la bonne feuille', () => {
    const t = locateTable(
      [
        { name: 'Notes', aoa: [['Bonjour'], ['texte libre']] },
        { name: 'Charges', aoa: [['Désignation', 'Prix HT', 'Périodicité'], ['Logiciel', 74, 'Mensuel']] },
      ],
      CHARGE_FIELDS,
    )!;
    expect(t.sheet).toBe('Charges');
  });
});
