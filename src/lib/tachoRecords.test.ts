import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { matchDriver } from './tachoRecords';

const drivers = [{ id: '1', name: 'Marc Dupuy' }, { id: '2', name: 'Rachid Belaïd' }, { id: '3', name: 'Paul Dupuy' }];

describe('Rattachement d’une carte à son conducteur', () => {
  it('par le nom, sans accents ni casse', () => {
    expect(matchDriver({ surname: 'BELAID', firstNames: 'RACHID' }, drivers)?.id).toBe('2');
  });
  it('homonymes : départagés par le prénom', () => {
    expect(matchDriver({ surname: 'DUPUY', firstNames: 'PAUL ANDRE' }, drivers)?.id).toBe('3');
  });
  it('inconnu : non rattaché', () => {
    expect(matchDriver({ surname: 'MARTIN', firstNames: 'LUC' }, drivers)).toBeNull();
  });
});
