import { describe, it, expect } from 'vitest';
import { balanceText, palletBalances, type PalletMovement } from './pallets';

const m = (client_id: string, given: number, returned: number, pallet_type = 'EUR', movement_date = '2026-10-01'): PalletMovement =>
  ({ id: Math.random().toString(), client_id, site: null, movement_date, pallet_type, given, returned, reference: null, source: 'bureau', note: null, created_at: '' });

describe('palettes', () => {
  it('solde par client et par type, trié par écart', () => {
    const b = palletBalances([m('a', 10, 4), m('a', 0, 2, 'EUR', '2026-10-05'), m('b', 33, 0), m('a', 2, 0, 'Demi-palette')]);
    expect(b[0]).toMatchObject({ clientId: 'b', total: 33 });
    expect(b[1]).toMatchObject({ clientId: 'a', total: 6, lastDate: '2026-10-05', byType: { EUR: 4, 'Demi-palette': 2 } });
    expect(balanceText(0)).toBe('À jour');
    expect(balanceText(-3)).toBe('Nous devons 3 palettes au client');
  });
});
