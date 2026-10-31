// Envoi d'un document société (Kbis ou licence de transport) depuis le logiciel.
// - réservé à la Direction et à l'Exploitation de la société (company_document_can_upload) ;
// - une IA lit le document : type, raison sociale, SIREN, adresse, dirigeant, dates ;
// - les incohérences avec la fiche société sont relevées (SIREN, nom, date, type, validité) ;
// - le document est enregistré « à contrôler » : OptiGroup le valide dans OptiCentral.
// Fichier partagé (bridge/shared/documents) — le même dans OptiFret, OptiFlow et OptiXpress.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_LEN = 7_500_000; // data URL (≈ 5,5 Mo de fichier)

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "document_type", "readable", "company_name", "siren", "address", "manager_name",
    "licence_number", "licence_kind", "issued_on", "expires_on", "notes",
  ],
  properties: {
    document_type: { type: "string", enum: ["kbis", "licence_transport", "autre"] },
    readable: { type: "boolean", description: "false si le document est flou, coupé ou illisible" },
    company_name: { type: ["string", "null"] },
    siren: { type: ["string", "null"], description: "9 chiffres sans espace (ou les 9 premiers du SIRET)" },
    address: { type: ["string", "null"] },
    manager_name: { type: ["string", "null"], description: "Dirigeant / gérant / représentant légal" },
    licence_number: { type: ["string", "null"] },
    licence_kind: { type: ["string", "null"], description: "ex. licence communautaire, licence intérieure, LTI, LC" },
    issued_on: { type: ["string", "null"], description: "Kbis : date d'édition de l'extrait (« à jour au »). Licence : date de délivrance. Format AAAA-MM-JJ" },
    expires_on: { type: ["string", "null"], description: "Licence : date de fin de validité si indiquée. Format AAAA-MM-JJ" },
    notes: { type: "string", description: "Remarque courte en français (anomalie visible), ou chaîne vide" },
  },
};

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(sas|sasu|sarl|eurl|sa|sci|snc|societe|ste|transports?|et|de|des|du|la|le|les)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function sameName(a: unknown, b: unknown) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  const tx = new Set(x.split(" ").filter((t) => t.length > 2));
  const ty = y.split(" ").filter((t) => t.length > 2);
  if (!ty.length || !tx.size) return true;
  return ty.filter((t) => tx.has(t)).length / Math.min(ty.length, tx.size) >= 0.5;
}

const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const addMonths = (iso: string, m: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 10);
};
const frDate = (iso: string) => iso.split("-").reverse().join("/");

async function readAi(dataUrl: string, mime: string, kind: string, fileName: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Service IA non configuré");
  const part = mime === "application/pdf"
    ? { type: "input_file", filename: fileName || "document.pdf", file_data: dataUrl }
    : { type: "input_image", image_url: dataUrl, detail: "high" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        `Tu lis un document administratif français d'une entreprise de transport routier. ` +
        `Document attendu : ${kind === "kbis" ? "extrait Kbis (registre du commerce)" : "licence de transport (licence communautaire ou intérieure, copie conforme)"}. ` +
        `Recopie exactement ce qui est écrit, sans rien inventer : un champ absent ou illisible vaut null. ` +
        `Dates au format AAAA-MM-JJ. Pour un Kbis, issued_on est la date « à jour au » / date d'édition de l'extrait, pas la date d'immatriculation.`,
      input: [{ role: "user", content: [{ type: "input_text", text: "Voici le document." }, part] }],
      text: { format: { type: "json_schema", name: "company_document", strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(res.status === 429 ? "Trop de demandes" : res.status === 402 ? "Crédits IA épuisés" : `Lecture impossible (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") out += ev.delta;
      } catch { /* ignore */ }
    }
  }
  if (!out) throw new Error("Document non lu");
  return JSON.parse(out) as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ ok: false, error: "Connectez-vous pour envoyer un document." }, 401);

    const body = await req.json().catch(() => ({}));
    const { license_id, kind, file_name, data_url } = body as Record<string, string>;
    if (!/^[0-9a-f-]{36}$/i.test(license_id ?? "")) return json({ ok: false, error: "Société inconnue" }, 400);
    if (kind !== "kbis" && kind !== "licence") return json({ ok: false, error: "Type de document inconnu" }, 400);
    const m = /^data:([a-z/+.-]+);base64,/i.exec(data_url ?? "");
    const mime = m?.[1]?.toLowerCase() ?? "";
    if (!MIMES.includes(mime)) return json({ ok: false, error: "Formats acceptés : photo (JPG, PNG) ou PDF." }, 400);
    if (data_url.length > MAX_LEN) return json({ ok: false, error: "Fichier trop lourd (5 Mo maximum)." }, 400);

    const { data: allowed } = await userClient.rpc("company_document_can_upload", { p_license_id: license_id });
    if (allowed !== true)
      return json({ ok: false, error: "Seules la Direction et l'Exploitation peuvent envoyer les documents de la société." }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: lic } = await admin.from("licenses").select("*").eq("id", license_id).maybeSingle();
    if (!lic) return json({ ok: false, error: "Société introuvable" }, 404);
    const L = lic as Record<string, unknown>;

    let ex: Record<string, unknown> = {};
    let aiStatus: "done" | "failed" = "done";
    const issues: string[] = [];
    try {
      ex = await readAi(data_url, mime, kind, String(file_name ?? ""));
    } catch (e) {
      aiStatus = "failed";
      issues.push(`Lecture automatique impossible (${(e as Error).message}) : OptiGroup vérifiera le document.`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const issued = isDate(ex.issued_on) ? String(ex.issued_on) : null;
    const expires = isDate(ex.expires_on) ? String(ex.expires_on) : null;
    if (aiStatus === "done") {
      if (ex.readable === false) issues.push("Document peu lisible : renvoyez une photo plus nette, à plat et en entier.");
      if (kind === "kbis" && ex.document_type !== "kbis")
        issues.push("Ce document ne semble pas être un extrait Kbis.");
      if (kind === "licence" && ex.document_type !== "licence_transport")
        issues.push("Ce document ne semble pas être une licence de transport.");
      const docSiren = String(ex.siren ?? "").replace(/\D/g, "").slice(0, 9);
      const ownSiren = String(L.siren ?? L.siret ?? "").replace(/\D/g, "").slice(0, 9);
      if (docSiren && ownSiren && docSiren !== ownSiren)
        issues.push(`SIREN différent : ${docSiren} sur le document, ${ownSiren} sur la fiche société.`);
      if (!docSiren) issues.push("SIREN non trouvé sur le document.");
      if (ex.company_name && L.company_name && !sameName(ex.company_name, L.company_name))
        issues.push(`Raison sociale différente : « ${ex.company_name} » sur le document, « ${L.company_name} » sur la fiche.`);
      if (ex.manager_name && L.manager_name && !sameName(ex.manager_name, L.manager_name))
        issues.push(`Dirigeant différent : « ${ex.manager_name} » sur le document, « ${L.manager_name} » sur la fiche.`);
      if (!issued) issues.push(kind === "kbis" ? "Date d'édition du Kbis non trouvée." : "Date de délivrance de la licence non trouvée.");
      if (issued && issued > today) issues.push(`Date du document dans le futur (${frDate(issued)}).`);
      if (kind === "kbis" && issued && addMonths(issued, 3) < today)
        issues.push(`Kbis de plus de 3 mois (édité le ${frDate(issued)}) : envoyez un extrait récent.`);
      if (kind === "licence") {
        const until = [expires, issued ? addMonths(issued, 36) : null].filter(Boolean).sort()[0] as string | undefined;
        if (until && until < today) issues.push(`Licence expirée depuis le ${frDate(until)}.`);
      }
      if (typeof ex.notes === "string" && ex.notes.trim()) issues.push(`Remarque de lecture : ${ex.notes.trim()}`);
    }

    const { data: row, error } = await admin
      .from("company_documents")
      .insert({
        license_id,
        kind,
        file_name: String(file_name ?? "").slice(0, 200) || null,
        mime,
        data_url,
        uploaded_by: u.user.email ?? null,
        issued_on: issued,
        expires_on: kind === "licence" ? expires : null,
        extracted: ex,
        issues,
        ai_status: aiStatus,
      })
      .select("id, kind, issued_on, expires_on, issues, ai_status, status, uploaded_at")
      .single();
    if (error) throw new Error(error.message);
    return json({ ok: true, document: row, extracted: ex });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
