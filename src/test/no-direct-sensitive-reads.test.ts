import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Garde-fou CI : les tables contenant des salaires ou des marges ne doivent
 * jamais être lues directement depuis le client.
 *
 * Leur SELECT est réservé à la Direction en base ; les autres rôles passent par
 * des fonctions sécurisées qui masquent les montants sensibles.
 * Une lecture directe repasserait silencieusement à zéro ligne pour
 * l'Exploitation et les Membres — ce test l'empêche.
 */
const SENSITIVE_TABLES = ['user_drivers', 'trips', 'quotes', 'saved_tours'] as const;

const MASKED_RPC: Record<string, string> = {
  user_drivers: 'get_drivers_masked',
  trips: 'get_trips_masked',
  quotes: 'get_quotes_masked',
  saved_tours: 'get_saved_tours_masked',
};

const SRC = join(process.cwd(), 'src');

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'test' || entry.startsWith('__tests__')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Lecture des données sensibles (salaires, marges)', () => {
  const files = collectFiles(SRC);

  it('trouve des fichiers à analyser', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const table of SENSITIVE_TABLES) {
    it(`n'appelle jamais .from('${table}').select() directement`, () => {
      // Autorise .from(table).insert/update/delete/upsert, interdit .select
      const pattern = new RegExp(
        `\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)\\s*(?:\\r?\\n\\s*)*\\.select\\(`,
        'g',
      );
      const offenders: string[] = [];

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (pattern.test(content)) {
          offenders.push(file.replace(process.cwd() + '/', ''));
        }
        pattern.lastIndex = 0;
      }

      expect(
        offenders,
        `Lecture directe de "${table}" détectée. Utilisez supabase.rpc('${MASKED_RPC[table]}') à la place dans : ${offenders.join(', ')}`,
      ).toEqual([]);
    });
  }
});
