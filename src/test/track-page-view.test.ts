import { describe, expect, it, vi } from 'vitest';
import { trackPageView, trackedPath } from '@/lib/companyAccess';

// Comme le vrai client : un objet « thenable » SANS méthode catch.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: () => ({ then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.reject(new Error('hors ligne')).then(ok, ko) }),
  },
}));

// Le constructeur de requête Supabase n'a pas de .catch : trackPageView ne doit
// jamais lever d'erreur (sinon tout le logiciel affiche « Une erreur est survenue »).
describe('suivi des onglets ouverts', () => {
  it("n'interrompt jamais l'affichage", () => {
    expect(() => trackPageView('00000000-0000-4000-8000-000000000000', '/planning')).not.toThrow();
  });
  it('retire les identifiants des chemins', () => {
    expect(trackedPath('/routes/3f2c9a1e-1111-4222-8333-444455556666/edit')).toBe('/routes/edit');
    expect(trackedPath('/')).toBe('/');
  });
});
