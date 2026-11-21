// Ancien envoi du code de licence par email : plus utilisé (les accès se créent depuis
// OptiCentral). Fermé, car n'importe qui pouvait choisir le destinataire et le contenu.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  return new Response(JSON.stringify({ success: false, error: "Les accès se créent depuis OptiCentral" }), {
    status: 410,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
