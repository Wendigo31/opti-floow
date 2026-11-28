import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildExcel, excelFileName } from './oppExcel';

describe('export Excel', () => {
  it('un onglet Société puis un onglet par table non vide, noms en français', async () => {
    const buf = await buildExcel({
      app: 'OptiFret',
      exported_at: '2026-11-28T12:00:00Z',
      company: { company_name: 'Transports Test', siret: '123' },
      tables: {
        clients: [{ id: 1, name: 'Client A', address: { city: 'Toulouse' } }],
        invoices: [{ id: 'f1', total: 120.5 }],
        vide: [],
        une_table_au_nom_vraiment_tres_tres_long: [{ a: 1 }],
      },
    });
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    expect(wb.SheetNames[0]).toBe('Société');
    expect(wb.SheetNames).toContain('Clients');
    expect(wb.SheetNames).toContain('Factures');
    expect(wb.SheetNames.some((n) => n.length > 31)).toBe(false);
    expect(wb.SheetNames).not.toContain('vide');
    const clients = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Clients);
    expect(clients[0].name).toBe('Client A');
    expect(clients[0].address).toBe('{"city":"Toulouse"}');
  });

  it('nom de fichier lisible', () => {
    expect(excelFileName('OptiFret', 'Transports Élite')).toMatch(/^optifret-transports-elite-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
