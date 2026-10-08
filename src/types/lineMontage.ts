/**
 * Types partagés par src/components/ai/LineMontageTab.tsx et ses
 * sous-composants (src/components/ai/line-montage/*.tsx). Extrait de
 * LineMontageTab.tsx pour alléger ce fichier — aucun changement de
 * comportement.
 */

export interface Position {
  lat: number;
  lon: number;
}

export interface StopWaypoint {
  id: string;
  address: string;
  position: Position | null;
}

export interface MontageScenario {
  name: string;
  driverCount: number;
  overnightStays: boolean;
  totalCost: number;
  totalDuration: number;
  weeklySchedule: {
    day: string;
    segments: {
      driver: string;
      startTime: string;
      endTime: string;
      activity: string;
      notes?: string;
    }[];
  }[];
  costBreakdown: {
    fuel: number;
    tolls: number;
    drivers: number;
    meals: number;
    overnight: number;
    vehicleCost: number;
    structureCost: number;
    total: number;
  };
  rseCompliance: {
    valid: boolean;
    notes: string[];
    warnings: string[];
  };
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

export interface MontageResponse {
  recommendation: {
    summary: string;
    bestScenario: string;
    estimatedWeeklyCost: number;
    estimatedMonthlyCost: number;
  };
  scenarios: MontageScenario[];
  regulatoryNotes: string[];
  tips: string[];
  warnings: string[];
}
