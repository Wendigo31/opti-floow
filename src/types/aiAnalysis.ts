export interface GeoPosition {
  lat: number;
  lon: number;
}

export interface StopWaypoint {
  id: string;
  address: string;
  position: GeoPosition | null;
}

export interface AIOptimization {
  type: string;
  description: string;
  savings: number;
  impact?: string;
}

export interface AISegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
  driver: string;
  type: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface AIRelayPoint {
  location: string;
  km: number;
  driverOut: string;
  driverIn: string;
  estimatedTime: string;
  waitTime: number;
  notes?: string;
}

export interface AIStrategy {
  name: string;
  type: string;
  timing: string;
  totalCost: number;
  totalDuration: number;
  breakdown: { fuel: number; tolls: number; drivers: number; meals: number; overnight: number; vehicleCost?: number };
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

export interface AIRelayPlan {
  isRecommended: boolean;
  reason: string;
  relayPoints: AIRelayPoint[];
  totalDriversCost: number;
  savingsVsSolo: number;
}

export interface AIResponse {
  recommendation: {
    summary: string;
    strategy?: string;
    estimatedCost: number;
    estimatedDuration: number;
    estimatedDistance: number;
    savings: number;
    savingsPercent: number;
    comparedTo?: string;
  };
  strategies?: AIStrategy[];
  relayPlan?: AIRelayPlan;
  routeDetails?: { departureTime: string; arrivalTime: string; segments: AISegment[] };
  costBreakdown?: {
    fuel: number; tolls: number; drivers: number; driverBonuses?: number; meals: number;
    overnight: number; vehicleCost?: number; structureCost?: number; total: number;
  };
  timeOptimization?: { standardDuration: number; optimizedDuration: number; timeSaved: number; explanation: string };
  optimizations?: AIOptimization[];
  alternatives?: { name: string; cost: number; duration: number; pros: string[]; cons: string[] }[];
  warnings?: string[];
  tips?: string[];
  regulatoryNotes?: string[];
  rawResponse?: string;
}

export type AnalysisMode = 'basic' | 'optimize_route' | 'relay_analysis' | 'full_optimization';