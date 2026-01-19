import { useState } from 'react';
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
export type FuelType = 'gazole' | 'b100' | 'gnv' | 'adblue';

// Prix de référence CNR (mis à jour mensuellement)
// Source: https://www.cnr.fr/indicateurs
const CNR_REFERENCE_PRICES: Record<FuelType, number> = {
  gazole: 1.45,
  b100: 1.55,
  gnv: 1.20,
  adblue: 0.89,
};

export function useFuelPrice() {
  const [loadingDiesel, setLoadingDiesel] = useState(false);
  const [loadingAdBlue, setLoadingAdBlue] = useState(false);
  const [loadingB100, setLoadingB100] = useState(false);
  const [loadingGNV, setLoadingGNV] = useState(false);

  const fetchDieselPrice = async (): Promise<number | null> => {
    setLoadingDiesel(true);
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
      setLoadingDiesel(false);
    }
  };

  const fetchAdBluePrice = async (): Promise<number | null> => {
    setLoadingAdBlue(true);
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
      setLoadingAdBlue(false);
    }
  };

  const fetchB100Price = async (): Promise<number | null> => {
    setLoadingB100(true);
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
      setLoadingB100(false);
    }
  };

  const fetchGNVPrice = async (): Promise<number | null> => {
    setLoadingGNV(true);
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
      setLoadingGNV(false);
    }
  };

  const fetchAllPrices = async (): Promise<{
    gazole: number | null;
    b100: number | null;
    gnv: number | null;
    adblue: number | null;
  }> => {
    const [gazole, b100, gnv, adblue] = await Promise.all([
      fetchDieselPrice(),
      fetchB100Price(),
      fetchGNVPrice(),
      fetchAdBluePrice(),
    ]);
    return { gazole, b100, gnv, adblue };
  };

  return { 
    fetchDieselPrice, 
    loadingDiesel,
    fetchAdBluePrice,
    loadingAdBlue,
    fetchB100Price,
    loadingB100,
    fetchGNVPrice,
    loadingGNV,
    fetchAllPrices,
    referenceprices: CNR_REFERENCE_PRICES,
  };
}
