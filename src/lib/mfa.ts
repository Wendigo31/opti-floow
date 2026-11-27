/**
 * Double authentification (code à 6 chiffres d'une appli comme Google Authenticator,
 * Microsoft Authenticator ou Authy), via l'authentification Supabase (facteur TOTP).
 * Fichier identique dans OptiFret, OptiFlow et OptiXpress.
 */
import { supabase } from '@/integrations/supabase/client';

export interface MfaFactor {
  id: string;
  friendly_name?: string | null;
  status: string;
}

/** Facteurs « appli d'authentification » déjà activés sur le compte connecté. */
export async function listTotpFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).filter((f) => f.status === 'verified') as MfaFactor[];
}

/** Le compte a la double authentification et la session n'a pas encore été confirmée par un code. */
export async function mfaCodeNeeded(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  } catch {
    return false; // client sans MFA (démo, tests) : rien à demander
  }
}

/** Vérifie un code à 6 chiffres pour la session en cours. */
export async function verifyMfaCode(code: string): Promise<void> {
  const factors = await listTotpFactors();
  if (!factors.length) throw new Error("Aucune appli d'authentification n'est liée à ce compte");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factors[0].id, code: code.replace(/\s/g, '') });
  if (error) throw new Error('Code incorrect ou expiré');
}

/** Étape 1 de l'activation : renvoie le QR code à scanner et la clé à saisir à la main. */
export async function startMfaEnrollment(): Promise<{ factorId: string; qr: string; secret: string }> {
  // Un essai d'activation abandonné laisse un facteur « non vérifié » : on le retire d'abord.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of (list?.all ?? []).filter((x) => x.status !== 'verified')) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `OptiGroup ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) throw new Error("Impossible de démarrer l'activation");
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Étape 2 de l'activation : le premier code confirme que l'appli est bien réglée. */
export async function confirmMfaEnrollment(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
  if (error) throw new Error('Code incorrect : vérifiez l’heure du téléphone et réessayez');
}

/** Désactivation (la session doit déjà être confirmée par un code). */
export async function disableMfa(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error('Impossible de désactiver : reconnectez-vous avec votre code puis réessayez');
}

// --- Demande du code pendant la connexion -------------------------------------------------
// La connexion (accounts.ts) attend le code ; la fenêtre MfaPrompt, posée une fois dans
// l'application, le demande à l'utilisateur. Aucun écran de connexion n'a besoin d'être modifié.

type Pending = { resolve: (code: string) => void; reject: (e: Error) => void };
let pending: Pending | null = null;
const listeners = new Set<(open: boolean) => void>();

export function onMfaPrompt(fn: (open: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function askMfaCode(): Promise<string> {
  pending?.reject(new Error('Connexion annulée'));
  return new Promise<string>((resolve, reject) => {
    pending = { resolve, reject };
    listeners.forEach((l) => l(true));
  });
}

export function answerMfaPrompt(code: string | null): void {
  const p = pending;
  pending = null;
  listeners.forEach((l) => l(false));
  if (!p) return;
  if (code) p.resolve(code);
  else p.reject(new Error('Connexion annulée : code de double authentification non saisi'));
}

/** À appeler juste après le mot de passe : demande le code tant qu'il est faux (3 essais). */
export async function completeMfaIfNeeded(): Promise<void> {
  if (!(await mfaCodeNeeded())) return;
  let lastError: Error | null = null;
  for (let i = 0; i < 3; i++) {
    const code = await askMfaCode();
    try {
      await verifyMfaCode(code);
      return;
    } catch (e) {
      lastError = e as Error;
    }
  }
  await supabase.auth.signOut();
  throw lastError ?? new Error('Code incorrect');
}
