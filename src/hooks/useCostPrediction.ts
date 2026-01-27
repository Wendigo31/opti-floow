import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonthPrediction {
  month: number;
  monthName: string;
  fuelPrice: number;
  fuelPriceChange: number;
  tollCost: number;
  tollCostChange: number;
  estimatedTripCost: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface PredictionSummary {
  averageFuelChange: number;
  averageTollChange: number;
  worstCaseScenario: number;
  bestCaseScenario: number;
  recommendation: string;
}

export interface CostPredictionResult {
  predictions: MonthPrediction[];
  summary: PredictionSummary;
}

interface PredictionParams {
  currentFuelPrice: number;
  currentTollCost: number;
  distanceKm: number;
  fuelConsumption: number;
  months?: number;
}

export function useCostPrediction() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<CostPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async (params: PredictionParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('predict-costs', {
        body: {
          currentFuelPrice: params.currentFuelPrice,
          currentTollCost: params.currentTollCost,
          distanceKm: params.distanceKm,
          fuelConsumption: params.fuelConsumption,
          months: params.months || 6,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setPrediction(data as CostPredictionResult);
      return data as CostPredictionResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de prédiction';
      setError(message);
      toast.error('Erreur de prédiction IA', {
        description: message,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearPrediction = () => {
    setPrediction(null);
    setError(null);
  };

  return {
    loading,
    prediction,
    error,
    fetchPrediction,
    clearPrediction,
  };
}
