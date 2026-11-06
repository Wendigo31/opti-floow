import { describe, expect, it } from 'vitest';
import { buildOpp, oppFileName, readOpp, OPP_MAGIC } from './oppFormat';

const sample = {
  app: 'optiflow',
  exported_at: '2026-11-02T10:00:00Z',
  exported_by: 'Diane Direction',
  company: { company_name: 'Transports Dupont & Fils' },
  tables: { clients: [{ name: 'Client A' }, { name: 'Élodie' }], invoices: [] },
};

describe('format .opp', () => {
  it('écrit la signature, un en-tête lisible et relit les mêmes données', async () => {
    const text = await buildOpp(sample);
    expect(text.startsWith(`${OPP_MAGIC}\n`)).toBe(true);
    const header = JSON.parse(text.split('\n')[1]);
    expect(header).toMatchObject({ format: 'opp', version: 1, app: 'optiflow', company: 'Transports Dupont & Fils', tables: { clients: 2, invoices: 0 } });
    const back = await readOpp(text);
    expect(back.data).toEqual(sample);
  });

  it('refuse un fichier modifié', async () => {
    const text = await buildOpp(sample);
    const lines = text.split('\n');
    const header = JSON.parse(lines[1]);
    header.sha256 = '0'.repeat(64);
    lines[1] = JSON.stringify(header);
    await expect(readOpp(lines.join('\n'))).rejects.toThrow(/modifié/);
  });

  it("refuse un fichier qui n'est pas un .opp", async () => {
    await expect(readOpp('{"a":1}')).rejects.toThrow(/pas un export Opti/);
  });

  it('nomme le fichier avec le logiciel, la société et la date', () => {
    expect(oppFileName('optifret', 'Transports Dupont & Fils', new Date('2026-11-02T08:00:00Z'))).toBe('optifret-transports-dupont-fils-2026-11-02.opp');
  });
});
