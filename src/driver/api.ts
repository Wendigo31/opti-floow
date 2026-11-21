/**
 * Appli conducteur OptiFlow : accès sans compte, par le jeton du lien personnel
 * (gardé sur le téléphone après la première ouverture), fonctions driver_* de la base.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ClockEntry } from '@/lib/driverHours';

export const TOKEN_KEY = 'optiflow_driver_token';

/** Jeton : celui du lien (?token=) s'il y en a un, sinon celui gardé sur le téléphone. */
export function readToken(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('token');
  try {
    if (fromUrl) localStorage.setItem(TOKEN_KEY, fromUrl);
    return fromUrl || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return fromUrl || '';
  }
}
export function forgetToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* rien */ }
}

type RpcRes = { data: unknown; error: { message: string } | null };
export const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<RpcRes> }).rpc(fn, args);

export async function call<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export interface Tour {
  id: string;
  name: string;
  status: 'planned' | 'in_progress' | 'completed';
  start: string | null;
  end: string | null;
  origin: string | null;
  destination: string | null;
  stops: { address: string; label?: string }[];
  mission_order: string | null;
  notes: string | null;
  relay: boolean;
  relay_location: string | null;
  relay_time: string | null;
  client: string | null;
  client_id: string | null;
}
export interface DriverLog { id: string; kind: string; amount: number | null; liters: number | null; odometer: number | null; data: Record<string, unknown>; has_doc: boolean; at: string }
export interface DriverDoc { id: string; kind: string; entry_id: string | null; note: string | null; at: string }
export interface Day {
  driver: string | null;
  company: string | null;
  date: string;
  tours: Tour[];
  vehicle: { id: string; name: string | null; plate: string | null } | null;
  time: (ClockEntry & { odometer: number | null })[];
  report: { meals: number; overnight: boolean; notes: string | null } | null;
  logs: DriverLog[];
  documents: DriverDoc[];
}
export interface WeekDay { date: string; tours: number; first: string | null; last: string | null; absence: string | null }

export const isoDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const hm = (t?: string | null) => (t ? t.slice(0, 5).replace(':', 'h') : '');
export const clockTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Réduit une photo (≤ 1600 px, JPEG) pour l'envoi depuis le réseau mobile. */
async function shrink(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.8));
  } catch {
    return file;
  }
}

/** Envoie un fichier : ticket réservé par la base, puis dépôt dans le stockage privé. Renvoie le chemin. */
export async function uploadFile(token: string, file: Blob): Promise<string> {
  const isPdf = file.type === 'application/pdf';
  const isPng = file.type === 'image/png';
  const body = isPdf || isPng ? file : await shrink(file);
  const path = await call<string>('driver_upload_ticket', { p_token: token, p_ext: isPdf ? 'pdf' : isPng ? 'png' : 'jpg' });
  const { error } = await supabase.storage.from('driver-docs').upload(path, body, { contentType: isPdf ? 'application/pdf' : isPng ? 'image/png' : 'image/jpeg', upsert: false });
  if (error) throw new Error(`Envoi impossible : ${error.message}`);
  return path;
}

/** Position actuelle (facultative, 5 s max). */
export function position(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 5000, maximumAge: 60_000 });
  });
}
