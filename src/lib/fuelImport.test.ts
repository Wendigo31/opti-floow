import { describe, it, expect } from 'vitest';
import { parseFuelCsv, vehicleFuelStats, parseNumber } from './fuelImport';

describe('import cartes carburant', () => {
  it('format AS24 / DKV avec ; et virgules', () => {
    const csv = `Date transaction;Heure;N° carte;Immatriculation;Station;Produit;Quantité;Montant HT;Montant TTC;Kilométrage
02/10/2026;06:15;7070000123;TT-001-AA;AS24 Montauban;Gazole;412,50;580,12;696,14;150 000
09/10/2026;07:00;7070000123;TT-001-AA;AS24 Agen;Gazole;398,00;552,60;663,12;151 420
ligne invalide;;;`;
    const { rows, errors } = parseFuelCsv(csv);
    expect(rows).toHaveLength(2);
    expect(errors).toBe(1);
    expect(rows[0]).toMatchObject({ plate: 'TT001AA', liters: 412.5, amount_ht: 580.12, amount_ttc: 696.14, mileage: 150000, card: '7070000123' });
    const st = vehicleFuelStats(rows);
    expect(st.km).toBe(1420);
    expect(Math.round(st.litersPer100!)).toBe(28);
    expect(rows[0].import_key).not.toBe(rows[1].import_key);
  });
  it('nombres', () => {
    expect(parseNumber('1 234,56 €')).toBe(1234.56);
    expect(parseNumber('1,234.56')).toBe(1234.56);
  });
});
