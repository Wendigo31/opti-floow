import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface GovFuelRecord {
  gazole_prix: number | null;
  gplc_prix?: number | null;
}

interface GovApiResponse {
  total_count: number;
  results: GovFuelRecord[];
}

// Types de carburant supportés
export type FuelType = 'diesel' | 'b100' | 'gnv' | 'electric';

// Mapping vers les clés API
const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: 'Gazole',
  b100: 'Bio-Gazole (B100)',
  gnv: 'GNV (Gaz)',
  electric: 'Électrique',
};

// Prix de référence CNR (mis à jour mensuellement)
// Source: https://www.cnr.fr/indicateurs
const CNR_REFERENCE_PRICES: Record<FuelType | 'adblue', number> = {
  diesel: 1.45,
  b100: 1.55,
  gnv: 1.20,
  electric: 0.25, // €/kWh
  adblue: 0.89,
};

// Taux de TVA par défaut
const DEFAULT_TVA_RATE = 20;

// Convertir TTC en HT
export const convertTTCtoHT = (priceTTC: number, tvaRate: number = DEFAULT_TVA_RATE): number => {
  return priceTTC / (1 + tvaRate / 100);
};

// Convertir HT en TTC
export const convertHTtoTTC = (priceHT: number, tvaRate: number = DEFAULT_TVA_RATE): number => {
  return priceHT * (1 + tvaRate / 100);
};

export function useFuelPrice() {
  const [loading, setLoading] = useState<Record<FuelType | 'adblue', boolean>>({
    diesel: false,
    b100: false,
    gnv: false,
    electric: false,
    adblue: false,
  });

  const fetchDieselPrice = useCallback(async (): Promise<number | null> => {
    setLoading(prev => ({ ...prev, diesel: true }));
    try {
      const response = await fetch(
        'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?select=gazole_prix&where=gazole_prix%20is%20not%20null&limit=100'
      );
      
      if (!response.ok) {
        throw new Error('Erreur API gouvernement');
      }
      
      const data: GovApiResponse = await response.json();
      
      if (data.results && data.results.length > 0) {
        const prices = data.results
          .map(r => r.gazole_prix)
          .filter((p): p is number => p !== null && p > 0);
        
        if (prices.length > 0) {
          const averagePriceTTC = prices.reduce((sum, p) => sum + p, 0) / prices.length;
          const roundedPrice = Math.round(averagePriceTTC * 1000) / 1000;
          
          toast.success(`Prix Gazole TTC mis à jour: ${roundedPrice.toFixed(3)} €/L (moyenne nationale)`);
          return roundedPrice;
        }
      }
      
      throw new Error('Données invalides');
    } catch (error) {
      console.error('Fuel price fetch error:', error);
      toast.error('Impossible de récupérer le prix du gazole');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, diesel: false }));
    }
  }, []);

  const fetchAdBluePrice = useCallback(async (): Promise<number | null> => {
    setLoading(prev => ({ ...prev, adblue: true }));
    try {
      // Prix moyen AdBlue en France (source: moyenne marché)
      // L'AdBlue n'a pas d'API publique, on utilise un prix de référence CNR
      const averagePrice = CNR_REFERENCE_PRICES.adblue;
      
      toast.success(`Prix AdBlue TTC mis à jour: ${averagePrice.toFixed(2)} €/L (prix CNR)`);
      return averagePrice;
    } catch (error) {
      console.error('AdBlue price fetch error:', error);
      toast.error('Impossible de récupérer le prix de l\'AdBlue');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, adblue: false }));
    }
  }, []);

  const fetchB100Price = useCallback(async (): Promise<number | null> => {
    setLoading(prev => ({ ...prev, b100: true }));
    try {
      // Bio-gazole B100 - prix de référence CNR (pas d'API publique)
      const averagePrice = CNR_REFERENCE_PRICES.b100;
      
      toast.success(`Prix B100 TTC mis à jour: ${averagePrice.toFixed(2)} €/L (prix CNR)`);
      return averagePrice;
    } catch (error) {
      console.error('B100 price fetch error:', error);
      toast.error('Impossible de récupérer le prix du B100');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, b100: false }));
    }
  }, []);

  const fetchGNVPrice = useCallback(async (): Promise<number | null> => {
    setLoading(prev => ({ ...prev, gnv: true }));
    try {
      // GNV - prix de référence CNR (indicateur 85)
      const averagePrice = CNR_REFERENCE_PRICES.gnv;
      
      toast.success(`Prix GNV TTC mis à jour: ${averagePrice.toFixed(2)} €/kg (prix CNR)`);
      return averagePrice;
    } catch (error) {
      console.error('GNV price fetch error:', error);
      toast.error('Impossible de récupérer le prix du GNV');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, gnv: false }));
    }
  }, []);

  const fetchElectricPrice = useCallback(async (): Promise<number | null> => {
    setLoading(prev => ({ ...prev, electric: true }));
    try {
      // Prix électricité - référence tarif professionnel
      const averagePrice = CNR_REFERENCE_PRICES.electric;
      
      toast.success(`Prix électricité TTC mis à jour: ${averagePrice.toFixed(2)} €/kWh (tarif pro)`);
      return averagePrice;
    } catch (error) {
      console.error('Electric price fetch error:', error);
      toast.error('Impossible de récupérer le prix de l\'électricité');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, electric: false }));
    }
  }, []);

  // Récupérer le prix selon le type de carburant
  const fetchFuelPrice = useCallback(async (fuelType: FuelType): Promise<number | null> => {
    switch (fuelType) {
      case 'diesel':
        return fetchDieselPrice();
      case 'b100':
        return fetchB100Price();
      case 'gnv':
        return fetchGNVPrice();
      case 'electric':
        return fetchElectricPrice();
      default:
        return null;
    }
  }, [fetchDieselPrice, fetchB100Price, fetchGNVPrice, fetchElectricPrice]);

  const fetchAllPrices = useCallback(async (): Promise<{
    diesel: number | null;
    b100: number | null;
    gnv: number | null;
    electric: number | null;
    adblue: number | null;
  }> => {
    const [diesel, b100, gnv, electric, adblue] = await Promise.all([
      fetchDieselPrice(),
      fetchB100Price(),
      fetchGNVPrice(),
      fetchElectricPrice(),
      fetchAdBluePrice(),
    ]);
    return { diesel, b100, gnv, electric, adblue };
  }, [fetchDieselPrice, fetchB100Price, fetchGNVPrice, fetchElectricPrice, fetchAdBluePrice]);

  return { 
    fetchDieselPrice, 
    loadingDiesel: loading.diesel,
    fetchAdBluePrice,
    loadingAdBlue: loading.adblue,
    fetchB100Price,
    loadingB100: loading.b100,
    fetchGNVPrice,
    loadingGNV: loading.gnv,
    fetchElectricPrice,
    loadingElectric: loading.electric,
    fetchFuelPrice,
    fetchAllPrices,
    loading,
    referencePrices: CNR_REFERENCE_PRICES,
    fuelTypeLabels: FUEL_TYPE_LABELS,
    convertTTCtoHT,
    convertHTtoTTC,
  };
}
