// Contrôle du forfait côté serveur pour les fonctions payantes (IA, cartes) : l'appel doit venir
// d'un utilisateur connecté, et sa société doit avoir l'une des fonctions demandées dans son
// forfait (license_features, réglé par OptiCentral). Sans ce contrôle, n'importe qui disposant
// de la clé publique de l'application pouvait appeler ces fonctions et consommer les crédits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requirePlanFeature(
  req: Request,
  anyOf: string[],
  cors: Record<string, string>,
): Promise<Response | null> {
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return deny(500, "Configuration serveur incomplète");
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token === anon) return deny(401, "Connexion requise");
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return deny(401, "Session expirée : reconnectez-vous");
  if (!anyOf.length) return null;
  // RLS : l'utilisateur ne lit que la ligne de sa société.
  const { data, error } = await sb.from("license_features").select(anyOf.join(",")).limit(5);
  if (error) return deny(403, "Licence introuvable");
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (!rows.some((r) => anyOf.some((f) => r[f] === true))) {
    return deny(403, "Cette fonction n'est pas incluse dans votre forfait");
  }
  return null;
}
