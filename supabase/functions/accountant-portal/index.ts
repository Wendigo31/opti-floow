// Espace expert-comptable (public) : vérifie le jeton du lien personnel et renvoie
// les dossiers comptables mensuels de la société avec des liens de téléchargement
// valables 1 heure. Lecture seule. Fichier partagé (bridge/shared/accounting).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let token = '';
  try {
    token = String((await req.json())?.token ?? '');
  } catch { /* corps invalide */ }
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return json({ error: 'Lien invalide.' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: link } = await db.from('accountant_links')
    .select('id, license_id, label, company, expires_at, revoked_at')
    .eq('token_hash', await sha256Hex(token)).maybeSingle();
  if (!link || link.revoked_at || (link.expires_at && new Date(link.expires_at) < new Date())) {
    return json({ error: 'Lien invalide, expiré ou révoqué. Demandez un nouveau lien à votre client.' }, 403);
  }
  await db.from('accountant_links').update({ last_access_at: new Date().toISOString() }).eq('id', link.id);

  const { data: rows } = await db.from('accounting_exports')
    .select('period, path, size, contents, created_at')
    .eq('license_id', link.license_id).order('period', { ascending: false }).limit(36);
  const exports = [];
  for (const r of rows ?? []) {
    const { data: signed } = await db.storage.from('accounting').createSignedUrl(r.path, 3600, { download: `dossier-comptable-${r.period}.zip` });
    if (signed?.signedUrl) exports.push({ period: r.period, created_at: r.created_at, size: r.size, contents: r.contents, url: signed.signedUrl });
  }
  return json({ company: link.company || 'Votre client', label: link.label, expires_at: link.expires_at, exports });
});
