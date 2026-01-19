// Lovable Cloud Edge Function: sirene-lookup
// Looks up company information from SIRET/SIREN using the French government's open API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SireneRequest {
  siret?: string;
  siren?: string;
}

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

// Map employee range codes to approximate counts
const employeeRangeMap: Record<string, { label: string; approx: number | null }> = {
  'NN': { label: 'Non employeur', approx: 0 },
  '00': { label: '0 salarié', approx: 0 },
  '01': { label: '1 ou 2 salariés', approx: 2 },
  '02': { label: '3 à 5 salariés', approx: 4 },
  '03': { label: '6 à 9 salariés', approx: 7 },
  '11': { label: '10 à 19 salariés', approx: 15 },
  '12': { label: '20 à 49 salariés', approx: 35 },
  '21': { label: '50 à 99 salariés', approx: 75 },
  '22': { label: '100 à 199 salariés', approx: 150 },
  '31': { label: '200 à 249 salariés', approx: 225 },
  '32': { label: '250 à 499 salariés', approx: 375 },
  '41': { label: '500 à 999 salariés', approx: 750 },
  '42': { label: '1 000 à 1 999 salariés', approx: 1500 },
  '51': { label: '2 000 à 4 999 salariés', approx: 3500 },
  '52': { label: '5 000 à 9 999 salariés', approx: 7500 },
  '53': { label: '10 000 salariés et plus', approx: 10000 },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as SireneRequest;
    const { siret, siren } = body;

    // Clean and validate input
    const cleanNumber = (siret || siren || '').replace(/\s/g, '');
    
    if (!cleanNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'SIRET ou SIREN requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SIRET = 14 digits, SIREN = 9 digits
    const isSiret = cleanNumber.length === 14;
    const isSiren = cleanNumber.length === 9;

    if (!isSiret && !isSiren) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format invalide. SIRET: 14 chiffres, SIREN: 9 chiffres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the open API from recherche-entreprises.api.gouv.fr (no authentication required)
    // This API works well from edge functions and doesn't require any API key
    const searchQuery = encodeURIComponent(cleanNumber);
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${searchQuery}&page=1&per_page=1`;

    console.log('[sirene-lookup] Fetching:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OptiFlow/1.0',
      },
    });

    if (!response.ok) {
      console.error('[sirene-lookup] API error:', response.status, await response.text());
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entreprise non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    const siege = result.siege || {};

    // Build company name
    let companyName = result.nom_complet || result.nom_raison_sociale || '';
    if (!companyName) {
      companyName = [result.dirigeants?.[0]?.prenom, result.dirigeants?.[0]?.nom].filter(Boolean).join(' ') || 'Inconnu';
    }

    // Get employee info from tranche_effectif_salarie
    const employeeCode = result.tranche_effectif_salarie || siege.tranche_effectif_salarie;
    const employeeInfo = employeeRangeMap[employeeCode] || { label: null, approx: null };

    // Build address
    const address = [
      siege.numero_voie,
      siege.type_voie,
      siege.libelle_voie,
    ].filter(Boolean).join(' ').trim() || siege.adresse || 'Non renseignée';

    const companyInfo: CompanyInfo = {
      siren: result.siren || cleanNumber.substring(0, 9),
      siret: siege.siret || (isSiret ? cleanNumber : undefined),
      companyName: companyName.trim(),
      address: address,
      postalCode: siege.code_postal || '',
      city: siege.libelle_commune || siege.commune || '',
      naf: result.activite_principale || siege.activite_principale || '',
      nafLabel: result.libelle_activite_principale || '',
      employeeCount: employeeInfo.approx,
      employeeRange: employeeInfo.label,
      legalStatus: result.nature_juridique || '',
      creationDate: result.date_creation || null,
    };

    console.log('[sirene-lookup] Found company:', companyInfo.companyName);

    return new Response(
      JSON.stringify({ success: true, company: companyInfo }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sirene-lookup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur lors de la recherche' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
