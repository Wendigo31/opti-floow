import { describe, it, expect } from 'vitest';
import { makeZip } from './zip';

describe('zip', () => {
  it('fabrique une archive lisible (signatures, nombre de fichiers, contenu)', () => {
    const z = makeZip([{ name: 'a.txt', data: 'bonjour' }, { name: 'dossier/é.csv', data: new Uint8Array([1, 2, 3]) }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const end = z.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    expect(v.getUint32(14, true)).toBe(0xa5b6f0c8); // CRC32 de « bonjour »
    expect(new TextDecoder().decode(z.slice(30 + 5, 30 + 5 + 7))).toBe('bonjour');
  });
});
