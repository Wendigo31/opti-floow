import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DriverInfo {
  name: string;
  hourlyCost: number;
  nightBonus?: number;
  sundayBonus?: number;
  mealAllowance?: number;
  overnightAllowance?: number;
  hoursPerDay?: number;
}

interface TripRequest {
  origin: string;
  destination: string;
  vehicleType: string;
  fuelConsumption: number;
  fuelPrice: number;
  tollClass?: number;
  drivers: DriverInfo[];
  constraints?: {
    maxDrivingHours?: number;
    preferNightDriving?: boolean;
    avoidWeekends?: boolean;
    allowRelay?: boolean;
    departureDate?: string;
    departureTime?: string;
    urgency?: 'standard' | 'express' | 'flexible';
  };
  mode?: 'basic' | 'optimize_route' | 'relay_analysis' | 'full_optimization';
  stops?: string[];
  currentCosts?: {
    fuel: number;
    tolls: number;
    driver: number;
    structure: number;
    total: number;
  };
  currentDistance?: number;
  currentDuration?: number;
  vehicleCosts?: {
    dailyCost: number;
    kmCost: number;
  };
  structureCosts?: {
    dailyCost: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tripRequest: TripRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert senior en optimisation logistique pour le transport routier de marchandises en France. 
Tu maîtrises parfaitement la réglementation RSE (Règlement Social Européen) et tu optimises les coûts de manière agressive.

RÈGLES DE CONDUITE (RSE):
- Conduite max: 4h30 avant pause obligatoire de 45min (ou 15min + 30min)
- Conduite max/jour: 9h (extensible à 10h deux fois par semaine)
- Conduite max/semaine: 56h
- Amplitude max: 13h (15h en équipage)
- Repos journalier: 11h consécutives (ou 9h + 3h fractionnées)

STRATÉGIES D'OPTIMISATION:
1. RELAIS CONDUCTEURS: Identifier les points de relais stratégiques (aires d'autoroute, dépôts partenaires) pour changer de conducteur et maintenir le véhicule en mouvement
2. CONDUITE DE NUIT: Moins de trafic, péages parfois réduits (-30% entre 22h-6h sur certains tronçons), mais prime de nuit conducteur
3. ÉVITEMENT PÉAGES: Routes nationales alternatives si le gain temps/péage le justifie
4. HORAIRES OPTIMAUX: Éviter heures de pointe (7h-9h, 17h-19h) pour réduire consommation carburant (+15-20% en embouteillages)
5. AIRES ÉCONOMIQUES: Carburant moins cher hors autoroute (économie ~15cts/L)

POINTS DE RELAIS CONNUS EN FRANCE:
- Aire de Beaune (A6) - Carrefour Nord/Sud
- Aire de Montélimar (A7) - Vallée du Rhône
- Aire d'Ambrussum (A9) - Méditerranée
- Aire de Tours (A10) - Axe Paris-Bordeaux
- Aire de Poitiers (A10) - Centre-Ouest
- Aire de Bourges (A71) - Centre France
- Aire de Metz (A4/A31) - Est
- Aire de Reims (A4) - Nord-Est
- Aire de Lille (A1) - Nord

Réponds TOUJOURS en JSON structuré avec ce format enrichi:
{
  "recommendation": {
    "summary": "Résumé concis de la meilleure stratégie",
    "strategy": "solo_day|solo_night|relay_day|relay_night|mixed",
    "estimatedCost": number,
    "estimatedDuration": number (heures),
    "estimatedDistance": number (km),
    "savings": number,
    "savingsPercent": number,
    "comparedTo": "description de la solution de référence"
  },
  "strategies": [
    {
      "name": "Nom de la stratégie",
      "type": "solo|relay|mixed",
      "timing": "day|night|mixed",
      "totalCost": number,
      "totalDuration": number,
      "breakdown": {
        "fuel": number,
        "tolls": number,
        "drivers": number,
        "meals": number,
        "overnight": number,
        "vehicleCost": number
      },
      "pros": ["avantages"],
      "cons": ["inconvénients"],
      "isRecommended": boolean
    }
  ],
  "relayPlan": {
    "isRecommended": boolean,
    "reason": "explication",
    "relayPoints": [
      {
        "location": "nom du point",
        "km": number (depuis départ),
        "driverOut": "nom conducteur sortant",
        "driverIn": "nom conducteur entrant",
        "estimatedTime": "HH:MM",
        "waitTime": number (minutes),
        "notes": "informations pratiques"
      }
    ],
    "totalDriversCost": number,
    "savingsVsSolo": number
  },
  "routeDetails": {
    "departureTime": "HH:MM recommandé",
    "arrivalTime": "HH:MM estimée",
    "segments": [
      {
        "from": "ville/point",
        "to": "ville/point",
        "distance": number,
        "duration": number,
        "driver": "nom",
        "type": "driving|rest|relay|refuel",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "notes": "remarques"
      }
    ]
  },
  "costBreakdown": {
    "fuel": number,
    "tolls": number,
    "drivers": number,
    "driverBonuses": number,
    "meals": number,
    "overnight": number,
    "vehicleCost": number,
    "structureCost": number,
    "total": number
  },
  "timeOptimization": {
    "standardDuration": number,
    "optimizedDuration": number,
    "timeSaved": number,
    "explanation": "comment le temps est optimisé"
  },
  "optimizations": [
    {
      "type": "relay|timing|route|fuel|tolls|regulation",
      "description": "Description détaillée",
      "savings": number,
      "impact": "high|medium|low"
    }
  ],
  "warnings": ["avertissements importants"],
  "tips": ["conseils pratiques"],
  "regulatoryNotes": ["notes réglementaires RSE"]
}`;

    let userPrompt: string;

    const driversDetail = (tripRequest.drivers || []).map(d => {
      const name = d.name || 'Conducteur';
      const hourlyCost = typeof d.hourlyCost === 'number' ? d.hourlyCost.toFixed(2) : '0.00';
      const nightBonus = d.nightBonus ? `, prime nuit: ${d.nightBonus}€` : '';
      const sundayBonus = d.sundayBonus ? `, prime dimanche: ${d.sundayBonus}€` : '';
      const mealAllowance = d.mealAllowance ? `, repas: ${d.mealAllowance}€` : '';
      const overnightAllowance = d.overnightAllowance ? `, découcher: ${d.overnightAllowance}€` : '';
      return `- ${name}: ${hourlyCost}€/h base${nightBonus}${sundayBonus}${mealAllowance}${overnightAllowance}`;
    }).join('\n') || 'Aucun conducteur défini';

    const constraintsDetail = `
CONTRAINTES:
- Heures de conduite max/jour: ${tripRequest.constraints?.maxDrivingHours || 9}h
- Préférence conduite de nuit: ${tripRequest.constraints?.preferNightDriving ? 'OUI (réduire coûts)' : 'NON'}
- Éviter weekends: ${tripRequest.constraints?.avoidWeekends ? 'OUI' : 'NON'}
- Autoriser relais: ${tripRequest.constraints?.allowRelay !== false ? 'OUI' : 'NON'}
- Urgence: ${tripRequest.constraints?.urgency || 'standard'}
${tripRequest.constraints?.departureDate ? `- Date de départ souhaitée: ${tripRequest.constraints.departureDate}` : ''}
${tripRequest.constraints?.departureTime ? `- Heure de départ souhaitée: ${tripRequest.constraints.departureTime}` : ''}`;

    const vehicleDetail = `
VÉHICULE:
- Type: ${tripRequest.vehicleType}
- Consommation: ${tripRequest.fuelConsumption} L/100km
- Prix carburant HT: ${tripRequest.fuelPrice}€/L
- Classe péage: ${tripRequest.tollClass || 2}
${tripRequest.vehicleCosts ? `- Coût véhicule: ${tripRequest.vehicleCosts.dailyCost}€/jour + ${tripRequest.vehicleCosts.kmCost}€/km` : ''}
${tripRequest.structureCosts ? `- Coût structure: ${tripRequest.structureCosts.dailyCost}€/jour` : ''}`;

    if (tripRequest.mode === 'optimize_route' && tripRequest.currentCosts) {
      userPrompt = `MISSION: OPTIMISATION COMPLÈTE D'UNE TOURNÉE EXISTANTE

TOURNÉE ACTUELLE À OPTIMISER:
- Origine: ${tripRequest.origin}
- Arrêts: ${tripRequest.stops?.length ? tripRequest.stops.join(' → ') : 'Aucun'}
- Destination: ${tripRequest.destination}
- Distance actuelle: ${tripRequest.currentDistance || '?'} km
- Durée actuelle: ${tripRequest.currentDuration ? `${Math.floor(tripRequest.currentDuration / 60)}h${tripRequest.currentDuration % 60}min` : '?'}

COÛTS ACTUELS (À BATTRE):
- Carburant: ${typeof tripRequest.currentCosts?.fuel === 'number' ? tripRequest.currentCosts.fuel.toFixed(2) : '0.00'}€
- Péages: ${typeof tripRequest.currentCosts?.tolls === 'number' ? tripRequest.currentCosts.tolls.toFixed(2) : '0.00'}€
- Conducteur: ${typeof tripRequest.currentCosts?.driver === 'number' ? tripRequest.currentCosts.driver.toFixed(2) : '0.00'}€
- Structure: ${typeof tripRequest.currentCosts?.structure === 'number' ? tripRequest.currentCosts.structure.toFixed(2) : '0.00'}€
- TOTAL: ${typeof tripRequest.currentCosts?.total === 'number' ? tripRequest.currentCosts.total.toFixed(2) : '0.00'}€

${vehicleDetail}

CONDUCTEURS DISPONIBLES POUR RELAIS:
${driversDetail}

${constraintsDetail}

OBJECTIF: Propose PLUSIEURS stratégies comparées:
1. Optimisation solo (un seul conducteur, mêmes contraintes)
2. Stratégie relais si applicable (>500km ou >6h)
3. Conduite de nuit si avantageuse
4. Mix optimal

Pour chaque stratégie, détaille les économies par rapport à la situation actuelle.
Identifie les points de relais stratégiques sur le parcours.
Calcule précisément les coûts avec primes (nuit, dimanche) et indemnités (repas, découcher).`;

    } else if (tripRequest.mode === 'relay_analysis') {
      userPrompt = `MISSION: ANALYSE SPÉCIFIQUE RELAIS CONDUCTEURS

TRAJET:
- Origine: ${tripRequest.origin}
- Destination: ${tripRequest.destination}
${tripRequest.stops?.length ? `- Étapes: ${tripRequest.stops.join(' → ')}` : ''}

${vehicleDetail}

ÉQUIPE DE CONDUCTEURS:
${driversDetail}

${constraintsDetail}

OBJECTIF SPÉCIFIQUE:
1. Identifier si un relais est pertinent (économiquement et réglementairement)
2. Proposer le(s) point(s) de relais optimal(aux) sur le parcours
3. Calculer le planning détaillé avec heures de relais
4. Comparer le coût AVEC et SANS relais
5. Intégrer les temps d'attente au relais (coordination conducteurs)

Sois très précis sur les économies de temps et le respect du RSE.`;

    } else if (tripRequest.mode === 'full_optimization') {
      userPrompt = `MISSION: OPTIMISATION MAXIMALE - TROUVER LA SOLUTION LA MOINS CHÈRE

TRAJET:
- Origine: ${tripRequest.origin}
- Destination: ${tripRequest.destination}
${tripRequest.stops?.length ? `- Étapes obligatoires: ${tripRequest.stops.join(' → ')}` : ''}

${vehicleDetail}

CONDUCTEURS DISPONIBLES:
${driversDetail}

${constraintsDetail}

ANALYSE DEMANDÉE:
1. STRATÉGIE SOLO DE JOUR: Un conducteur, horaires classiques
2. STRATÉGIE SOLO DE NUIT: Un conducteur, départ nocturne (moins de trafic, péages réduits)
3. STRATÉGIE RELAIS JOUR: Plusieurs conducteurs, maximum d'efficacité
4. STRATÉGIE RELAIS NUIT: Relais en nocturne
5. STRATÉGIE MIXTE: Combinaison optimale

Pour CHAQUE stratégie:
- Coût total détaillé
- Durée totale
- Planning horaire
- Avantages/Inconvénients

RECOMMANDE la stratégie avec le meilleur rapport COÛT/TEMPS.
Identifie les POINTS DE RELAIS PRÉCIS si applicable.`;

    } else {
      userPrompt = `MISSION: ANALYSE ET OPTIMISATION DE TRAJET

TRAJET:
- Origine: ${tripRequest.origin}
- Destination: ${tripRequest.destination}

${vehicleDetail}

CONDUCTEURS DISPONIBLES:
${driversDetail}

${constraintsDetail}

ANALYSE DEMANDÉE:
1. Évalue si un RELAIS est pertinent (distance >500km, durée >6h)
2. Compare les stratégies: solo vs relais, jour vs nuit
3. Identifie les aires de relais sur le parcours
4. Calcule les coûts détaillés avec toutes les primes/indemnités
5. Propose la solution OPTIMALE en termes de coût

Sois très précis sur les économies réalisables et les temps de trajet.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants, veuillez recharger." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let parsedResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResult = JSON.parse(jsonString);
    } catch {
      parsedResult = {
        recommendation: {
          summary: content,
          strategy: "unknown",
          estimatedCost: 0,
          estimatedDuration: 0,
          estimatedDistance: 0,
          savings: 0,
          savingsPercent: 0,
        },
        rawResponse: content,
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-optimize-trip error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
