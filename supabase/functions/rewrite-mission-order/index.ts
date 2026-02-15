import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { missionOrder, tourName, driverName, clientName, originAddress, destinationAddress, startTime } = await req.json();

    // Input validation
    if (!missionOrder || typeof missionOrder !== 'string') {
      return new Response(JSON.stringify({ error: "Aucun ordre de mission fourni" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (missionOrder.length > 5000) {
      return new Response(JSON.stringify({ error: "Ordre de mission trop long (max 5000 caractères)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Validate optional string fields
    const optionalFields = { tourName, driverName, clientName, originAddress, destinationAddress, startTime };
    for (const [fieldName, val] of Object.entries(optionalFields)) {
      if (val !== undefined && val !== null && (typeof val !== 'string' || val.length > 500)) {
        return new Response(JSON.stringify({ error: `Champ ${fieldName} invalide (max 500 caractères)` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un assistant spécialisé dans le transport routier de marchandises en France. 
Ta tâche est de réécrire un ordre de mission (ODM) brut pour le rendre clair, structuré et compréhensible par un conducteur poids lourd.

Règles :
- Remplace les abréviations courantes par leur signification complète :
  • SR = Semi-remorque
  • TR = Tracteur  
  • PC = Porteur caisse
  • RC = Remorque caisse
  • RDV = Rendez-vous
  • CHP = Chargement
  • DCHP = Déchargement
  • LOT = Lot complet
  • GP = Groupage
  • ADR = Matières dangereuses
  • Frigo = Frigorifique
- Structure le texte avec des sections claires (Départ, Étapes, Arrivée, Instructions particulières)
- Garde un ton professionnel mais simple
- Conserve TOUTES les informations (horaires, adresses, références, numéros)
- Si des infos contextuelles sont fournies (tournée, conducteur, client, adresses), intègre-les naturellement
- Réponds UNIQUEMENT avec le texte reformulé, sans commentaire ni explication`;

    let userMessage = `Voici l'ordre de mission brut à réécrire :\n\n${missionOrder}`;
    
    const context: string[] = [];
    if (tourName) context.push(`Ligne : ${tourName}`);
    if (driverName) context.push(`Conducteur : ${driverName}`);
    if (clientName) context.push(`Client : ${clientName}`);
    if (originAddress) context.push(`Départ : ${originAddress}`);
    if (destinationAddress) context.push(`Arrivée : ${destinationAddress}`);
    if (startTime) context.push(`Heure de prise de service : ${startTime}`);
    
    if (context.length > 0) {
      userMessage += `\n\nInformations contextuelles :\n${context.join('\n')}`;
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
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ rewritten }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rewrite-mission-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
