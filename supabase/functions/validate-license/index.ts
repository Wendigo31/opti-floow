import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, createServiceClient, getClientIp, errorResponse } from "./shared.ts";
import { handleSyncCompany } from "./sync.ts";
import { handleCheck } from "./check.ts";
import { handleValidate } from "./validate.ts";

// Anciennes actions du panneau d'administration : l'administration se fait désormais depuis
// OptiCentral (pont central_admin de la base). Elles sont fermées.
const REMOVED_ADMIN_ACTIONS = new Set([
  "list-all", "detect-duplicates", "merge-companies", "toggle-status",
  "update-plan", "create-license", "delete-license", "update-license",
  "get-company-data", "update-limits", "update-features", "update-visibility",
  "get-login-history", "get-user-stats", "get-user-details",
  "get-addons", "update-addons", "admin-update-addons", "admin-get-addons",
  "get-audit-logs", "list-access-requests", "process-access-request",
]);

serve(async (req: Request): Promise<Response> => {
  console.log("validate-license function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const clientIp = getClientIp(req);
    const body = await req.json();
    const action = body.action || "validate";

    if (REMOVED_ADMIN_ACTIONS.has(action)) {
      return errorResponse("L'administration se fait depuis OptiCentral", 410);
    }

    // Synchronisation de la société (Paramètres)
    if (action === "sync-company") {
      return handleSyncCompany(body, supabase);
    }

    // Route to check module
    if (action === "check") {
      return handleCheck(body, supabase, req);
    }

    // Default: validate (initial activation)
    return handleValidate(body, supabase, req, clientIp);

  } catch (error) {
    console.error("validate-license error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
});
