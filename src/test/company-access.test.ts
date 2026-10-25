import { describe, it, expect } from 'vitest';
import { canAccessPath, getVisibleNavCategories } from '@/config/appNavigation';
import type { TeamRole } from '@/types/team';

const ctx = (role: TeamRole, hiddenPaths: string[] = []) => ({
  hasFeature: () => true,
  canAccessUserFeature: () => true,
  isDirection: role === 'direction',
  role,
  hiddenPaths,
});

describe('accès par rôle (même règle dans les 3 logiciels)', () => {
  it('Exploitation : opérationnel, sans charges ni analyse financière', () => {
    for (const p of ['/planning', '/tours', '/vehicles', '/drivers', '/clients', '/tenders']) expect(canAccessPath(p, ctx('exploitation'))).toBe(true);
    for (const p of ['/charges', '/dashboard', '/forecast', '/team']) expect(canAccessPath(p, ctx('exploitation'))).toBe(false);
  });
  it('Comptabilité : charges, analyse, prévisionnel ; pas l\'opérationnel ni l\'équipe', () => {
    for (const p of ['/charges', '/dashboard', '/forecast']) expect(canAccessPath(p, ctx('comptabilite'))).toBe(true);
    for (const p of ['/planning', '/vehicles', '/team']) expect(canAccessPath(p, ctx('comptabilite'))).toBe(false);
  });
  it('RH : conducteurs et équipe', () => {
    for (const p of ['/drivers', '/team']) expect(canAccessPath(p, ctx('rh'))).toBe(true);
    for (const p of ['/charges', '/tours']) expect(canAccessPath(p, ctx('rh'))).toBe(false);
  });
  it('pages hors espaces toujours ouvertes', () => {
    for (const p of ['/', '/settings', '/espace/rh']) expect(canAccessPath(p, ctx('rh'))).toBe(true);
  });
});

describe('onglets désactivés pour la société depuis OptiCentral', () => {
  it('disparaissent du menu et sont refusés, même à la Direction', () => {
    const c = ctx('direction', ['/planning', '/charges']);
    const pages = new Set(getVisibleNavCategories(c).flatMap((x) => x.pages.map((p) => p.to)));
    expect(pages.has('/planning')).toBe(false);
    expect(pages.has('/charges')).toBe(false);
    expect(canAccessPath('/planning', c)).toBe(false);
    expect(canAccessPath('/tours', c)).toBe(true);
  });
});
