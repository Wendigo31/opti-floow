import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfo {
  siren: string;
  siret?: string;
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  naf: string;
  nafLabel: string;
  employeeCount: number | null;
  employeeRange: string | null;
  legalStatus: string;
  creationDate: string | null;
}

interface UseSireneLookupReturn {
  lookup: (siretOrSiren: string) => Promise<CompanyInfo | null>;
  loading: boolean;
  error: string | null;
  company: CompanyInfo | null;
}

export function useSireneLookup(): UseSireneLookupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  const lookup = async (siretOrSiren: string): Promise<CompanyInfo | null> => {
    const cleanNumber = siretOrSiren.replace(/\s/g, '');
    
    if (!cleanNumber) {
      setError('Veuillez entrer un SIRET ou SIREN');
      return null;
    }

    // Validate format
    if (cleanNumber.length !== 9 && cleanNumber.length !== 14) {
      setError('Format invalide. SIRET: 14 chiffres, SIREN: 9 chiffres');
      return null;
    }

    if (!/^\d+$/.test(cleanNumber)) {
      setError('Le numéro doit contenir uniquement des chiffres');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('sirene-lookup', {
        body: cleanNumber.length === 14 ? { siret: cleanNumber } : { siren: cleanNumber },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        setError(data?.error || 'Entreprise non trouvée');
        setCompany(null);
        return null;
      }

      setCompany(data.company);
      return data.company;
    } catch (err: any) {
      console.error('Sirene lookup error:', err);
      setError(err.message || 'Erreur lors de la recherche');
      setCompany(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading, error, company };
}
