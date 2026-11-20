import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requirePlanFeature } from "../_shared/planGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictionRequest {
  currentFuelPrice: number;
  currentTollCost: number;
  distanceKm: number;
  fuelConsumption: number; // L/100km
  months: number; // 3-6 months prediction
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const denied = await requirePlanFeature(req, ['page_ai_analysis'], corsHeaders);
  if (denied) return denied;

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<PredictionRequest>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
    const currentFuelPrice = num(body.currentFuelPrice);
    const currentTollCost = num(body.currentTollCost ?? 0);
    const distanceKm = num(body.distanceKm);
    const fuelConsumption = num(body.fuelConsumption);
    const months = Math.min(12, Math.max(1, Math.round(num(body.months ?? 6)) || 6));
    // Données manquantes (ex. appel de contrôle de l'audit OptiCentral) : erreur claire, pas une panne.
    if ([currentFuelPrice, currentTollCost, distanceKm, fuelConsumption].some(Number.isNaN)) {
      return new Response(
        JSON.stringify({ error: "Données manquantes : prix du carburant, péages, distance et consommation sont nécessaires." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en analyse des coûts du transport routier en France. 
Tu analyses les tendances du marché pour prédire l'évolution des prix du carburant et des péages.

Contexte actuel:
- Prix carburant actuel: ${currentFuelPrice.toFixed(3)} €/L
- Coût péages trajet: ${currentTollCost.toFixed(2)} €
- Distance: ${distanceKm} km
- Consommation: ${fuelConsumption} L/100km

Fournis une prédiction réaliste basée sur:
1. Tendances historiques du prix du diesel en France
2. Évolutions prévues des tarifs autoroutiers (généralement +2-4%/an)
3. Facteurs saisonniers (été = prix plus élevés)
4. Contexte géopolitique et économique

Important: Sois conservateur dans tes estimations.`;

    const userPrompt = `Génère une prédiction des coûts pour les ${months} prochains mois.`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "cost_prediction",
              description: "Retourne les prédictions de coûts pour les prochains mois",
              parameters: {
                type: "object",
                properties: {
                  predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "number", description: "Numéro du mois (1-6)" },
                        monthName: { type: "string", description: "Nom du mois en français" },
                        fuelPrice: { type: "number", description: "Prix estimé du carburant en €/L" },
                        fuelPriceChange: { type: "number", description: "Variation en % par rapport au prix actuel" },
                        tollCost: { type: "number", description: "Coût estimé des péages en €" },
                        tollCostChange: { type: "number", description: "Variation en % par rapport au coût actuel" },
                        estimatedTripCost: { type: "number", description: "Coût total estimé du trajet (carburant + péages)" },
                        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Niveau de confiance de la prédiction" },
                        factors: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Facteurs influençant cette prédiction"
                        }
                      },
                      required: ["month", "monthName", "fuelPrice", "fuelPriceChange", "tollCost", "tollCostChange", "estimatedTripCost", "confidence", "factors"]
                    }
                  },
                  summary: {
                    type: "object",
                    properties: {
                      averageFuelChange: { type: "number", description: "Variation moyenne du carburant sur la période" },
                      averageTollChange: { type: "number", description: "Variation moyenne des péages sur la période" },
                      worstCaseScenario: { type: "number", description: "Coût maximal estimé pour un trajet" },
                      bestCaseScenario: { type: "number", description: "Coût minimal estimé pour un trajet" },
                      recommendation: { type: "string", description: "Recommandation pour l'entreprise" }
                    },
                    required: ["averageFuelChange", "averageTollChange", "worstCaseScenario", "bestCaseScenario", "recommendation"]
                  }
                },
                required: ["predictions", "summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "cost_prediction" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const predictionResult = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(predictionResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("predict-costs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
