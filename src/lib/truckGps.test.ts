import { describe, expect, it } from 'vitest';
import { cumulative, haversine, nextStep, remainingFrom, snapToRoute, formatDistance, type LatLng, type GpsStep } from './truckGps';

const line: LatLng[] = [
  [43.6, 1.44],
  [43.601, 1.44],
  [43.602, 1.44],
  [43.602, 1.442],
  [43.602, 1.444],
];
const steps: GpsStep[] = [
  { instruction: 'Partez vers le nord', action: 'depart', lengthM: 222, durationS: 20, index: 0 },
  { instruction: 'Tournez à droite', action: 'turn', direction: 'right', lengthM: 320, durationS: 30, index: 2 },
  { instruction: 'Vous êtes arrivé', action: 'arrive', lengthM: 0, durationS: 0, index: 4 },
];

describe('GPS poids lourd', () => {
  it('mesure les distances', () => {
    expect(Math.round(haversine([43.6, 1.44], [43.601, 1.44]))).toBe(111);
    const cum = cumulative(line);
    expect(Math.round(cum[2])).toBe(222);
  });
  it('place le camion sur le tracé et détecte la sortie de route', () => {
    const on = snapToRoute(line, [43.6005, 1.44001]);
    expect(on.index).toBe(0);
    expect(on.offRouteM).toBeLessThan(5);
    const off = snapToRoute(line, [43.6005, 1.45]);
    expect(off.offRouteM).toBeGreaterThan(500);
  });
  it('donne la prochaine manœuvre et la distance restante', () => {
    const cum = cumulative(line);
    const pos = snapToRoute(line, [43.6015, 1.44]);
    const n = nextStep(steps, cum, pos.index, pos.t);
    expect(n.step?.instruction).toBe('Tournez à droite');
    expect(Math.round(n.distanceM)).toBeGreaterThan(50);
    expect(Math.round(n.distanceM)).toBeLessThan(60);
    expect(remainingFrom(cum, pos.index, pos.t)).toBeGreaterThan(n.distanceM);
    expect(formatDistance(1234)).toBe('1,2 km');
  });
});
