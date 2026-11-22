import { describe, expect, it } from 'vitest';
import { checkRules, parseDriverCard } from './tachograph';

/** Construit un faux fichier de carte : identification + 2 journées d'activité. */
function buildCard(): ArrayBuffer {
  const out: number[] = [];
  const block = (fid: number, kind: number, data: number[]) => {
    out.push(fid >> 8, fid & 0xff, kind, data.length >> 8, data.length & 0xff, ...data);
  };
  const str = (s: string, n: number) => Array.from({ length: n }, (_, i) => (i < s.length ? s.charCodeAt(i) : 0x20));
  const ident = [0x11, ...str('F12345678901234', 16), 0x01, ...str('ANTS', 35), ...new Array(12).fill(0),
    0x01, ...str('MARTIN', 35), 0x01, ...str('LEA', 35)];
  block(0x0520, 0, ident);
  const ch = (act: number, minute: number) => [((act << 11) | minute) >> 8, ((act << 11) | minute) & 0xff];
  const day = (date: string, prevLen: number, changes: number[][]) => {
    const t = Date.parse(`${date}T00:00:00Z`) / 1000;
    const body = [0x00, 0x01, 0x01, 0x2c, ...changes.flat()]; // présence + 300 km
    const len = 8 + body.length;
    return [prevLen >> 8, prevLen & 0xff, len >> 8, len & 0xff, (t >>> 24) & 0xff, (t >> 16) & 0xff, (t >> 8) & 0xff, t & 0xff, ...body];
  };
  // Jour 1 : repos jusqu'à 6 h, conduite 6 h → 11 h 30 (5 h 30 d'affilée), repos.
  const d1 = day('2026-11-16', 0, [ch(0, 0), ch(3, 360), ch(0, 690)]);
  // Jour 2 : repos jusqu'à 2 h (seulement 12 h 30 + 2 h = repos ok), conduite 2 h → 12 h 30, pause 45, conduite → 16 h.
  const d2 = day('2026-11-17', d1.length, [ch(0, 0), ch(3, 120), ch(0, 750), ch(3, 795), ch(2, 960), ch(0, 1020)]);
  const ring = [...d1, ...d2];
  block(0x0504, 0, [0x00, 0x00, (d1.length >> 8) & 0xff, d1.length & 0xff, ...ring]);
  return new Uint8Array(out).buffer;
}

describe('parseDriverCard', () => {
  const card = parseDriverCard(buildCard());
  it("lit l'identité et les journées", () => {
    expect(card.cardNumber).toBe('F12345678901234');
    expect(card.surname).toBe('MARTIN');
    expect(card.firstNames).toBe('LEA');
    expect(card.days.map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17']);
    expect(card.days[0].distanceKm).toBe(300);
  });
  it('compte les minutes par activité', () => {
    expect(card.days[0].minutes.driving).toBe(330);
    expect(card.days[1].minutes.driving).toBe(630 + 165);
    expect(card.days[1].minutes.work).toBe(60);
  });
  it('détecte les infractions', () => {
    const alerts = checkRules(card.days);
    const msgs = alerts.map((a) => a.message).join(' | ');
    expect(msgs).toContain('Conduite continue de 5 h 30');
    expect(msgs).toContain('Conduite journalière de 13 h 15');
  });
});
