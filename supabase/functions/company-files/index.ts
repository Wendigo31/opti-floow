// Fichiers d'une société, pour OptiCentral (secret du pont) et la copie de nuit (jeton de la base).
// Rangement (10/11/2026) — un compartiment par logiciel, nommé comme lui (optifret, optixpress,
// optiflow), puis un dossier par société nommé comme son adresse :
//   <société>.<logiciel>.app/documents/          documents envoyés par OptiGroup (factures, licence, Kbis…)
//   <société>.<logiciel>.app/software/           copie des données du logiciel (un fichier CSV par table)
//   <société>.<logiciel>.app/software/fichiers/  CMR, photos, signatures, preuves de livraison…
// Actions :
// - sign       : liens de lecture de 10 min pour des fichiers de la société ;
// - purge      : efface tous les fichiers de la société, avant sa suppression définitive ;
// - put        : dépose un document envoyé par OptiGroup dans documents/ ;
// - export     : réécrit la copie des données de la société dans software/ ;
// - export_all : idem pour toutes les sociétés (tâche de nuit, jeton propre à la base).
// La liste vient de central_files (base) : un fichier hors du dossier de la société ne peut être
// ni signé ni effacé.
// Fichier partagé — le même dans OptiFret, OptiXpress et OptiFlow.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type FileRow = { bucket: string; path: string };
type Listed = { folder: string | null; app: string; bucket?: string; files: FileRow[] };

// Colonnes jamais recopiées dans l'export (secrets, codes d'accès).
const SECRET_COLUMN = /(hash|secret|token|password|passwd|pin_code|^pin$|license_code|api_key|stripe_)/i;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV lisible par Excel en français : séparateur « ; », BOM UTF-8. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!SECRET_COLUMN.test(k) && !cols.includes(k)) cols.push(k);
  const lines = [cols.join(";"), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(";"))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function safeName(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");
  return base.replace(/^-+|-+$/g, "").slice(0, 120) || `document-${Date.now()}`;
}

async function exportCompany(admin: SupabaseClient, bucket: string, folder: string, licenseId: string) {
  const { data, error } = await admin.rpc("_company_export", { p_license_id: licenseId });
  if (error) throw new Error(error.message);
  const tables = (data ?? {}) as Record<string, Record<string, unknown>[]>;
  const written: string[] = [];
  for (const [table, rows] of Object.entries(tables)) {
    const path = `${folder}/software/${table}.csv`;
    const body = new TextEncoder().encode(toCsv(rows ?? []));
    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(path, body, { contentType: "text/csv; charset=utf-8", upsert: true });
    if (upErr) throw new Error(`${table} : ${upErr.message}`);
    written.push(path);
  }
  return written;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let body: {
    secret?: string;
    token?: string;
    action?: string;
    license_id?: string;
    files?: FileRow[];
    name?: string;
    mime?: string;
    base64?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }
  const { secret, action, license_id } = body;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Copie de nuit : déclenchée par la base elle-même (pg_cron), avec un jeton qu'elle seule connaît.
  if (action === "export_all") {
    const { data: ok } = await admin.rpc("_storage_export_token_ok", { p_token: body.token ?? "" });
    if (ok !== true) return json({ error: "Accès refusé" }, 403);
    const { data: list, error } = await admin.rpc("_storage_export_targets");
    if (error) return json({ error: error.message }, 500);
    const done: string[] = [];
    const failed: string[] = [];
    for (const t of (list ?? []) as { license_id: string; folder: string; bucket: string }[]) {
      try {
        await exportCompany(admin, t.bucket, t.folder, t.license_id);
        done.push(t.folder);
      } catch (e) {
        failed.push(`${t.folder} : ${(e as Error).message}`);
      }
    }
    return json({ exported: done.length, failed }, failed.length ? 500 : 200);
  }

  if (!secret || !license_id || !["sign", "purge", "put", "export"].includes(action ?? "")) {
    return json({ error: "Paramètres manquants" }, 400);
  }

  // Le secret est vérifié par la base : sans lui, central_files refuse.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: listedRaw, error: listErr } = await anon.rpc("central_files", {
    p_secret: secret,
    p_action: "list",
    p_payload: { license_id },
  });
  if (listErr) {
    const status = listErr.code === "28000" ? 403 : listErr.code === "P0002" ? 404 : 400;
    return json({ error: listErr.message, code: listErr.code }, status);
  }
  const listed = listedRaw as Listed;
  const bucket = listed.bucket ?? listed.app;
  const folder = listed.folder;
  const owned: FileRow[] = (listed?.files ?? []).map((f: FileRow) => ({ bucket: f.bucket, path: f.path }));
  const key = (f: FileRow) => `${f.bucket}/${f.path}`;
  const ownedSet = new Set(owned.map(key));

  if (action === "sign") {
    const wanted = (body.files ?? []).filter((f) => ownedSet.has(key(f))).slice(0, 50);
    const out: { bucket: string; path: string; url: string | null }[] = [];
    for (const f of wanted) {
      const { data } = await admin.storage.from(f.bucket).createSignedUrl(f.path, 600);
      out.push({ ...f, url: data?.signedUrl ?? null });
    }
    return json({ files: out });
  }

  if (action === "put") {
    if (!folder) return json({ error: "Dossier de la société introuvable" }, 404);
    if (!body.base64 || !body.name) return json({ error: "Document manquant" }, 400);
    const raw = body.base64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (bytes.length > 20 * 1024 * 1024) return json({ error: "Document trop volumineux (20 Mo max)" }, 413);
    const path = `${folder}/documents/${safeName(body.name)}`;
    const { error } = await admin.storage
      .from(bucket)
      .upload(path, bytes, { contentType: body.mime || "application/octet-stream", upsert: true });
    if (error) return json({ error: error.message }, 500);
    return json({ bucket, path });
  }

  if (action === "export") {
    if (!folder) return json({ error: "Dossier de la société introuvable" }, 404);
    try {
      const written = await exportCompany(admin, bucket, folder, license_id);
      return json({ bucket, folder, written });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // purge
  const byBucket = new Map<string, string[]>();
  for (const f of owned) {
    if (!byBucket.has(f.bucket)) byBucket.set(f.bucket, []);
    byBucket.get(f.bucket)!.push(f.path);
  }
  let removed = 0;
  const errors: string[] = [];
  for (const [b, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { data, error } = await admin.storage.from(b).remove(chunk);
      if (error) errors.push(`${b} : ${error.message}`);
      else removed += data?.length ?? 0;
    }
  }
  // Contrôle : il ne doit plus rien rester.
  const { data: after } = await anon.rpc("central_files", {
    p_secret: secret,
    p_action: "list",
    p_payload: { license_id },
  });
  const remaining = (after as Listed | null)?.files?.length ?? 0;
  if (errors.length || remaining > 0) {
    return json({ error: `Fichiers non effacés (${remaining} restants). ${errors.join(" ; ")}`.trim(), removed, remaining }, 500);
  }
  return json({ removed, remaining: 0, folder });
});
