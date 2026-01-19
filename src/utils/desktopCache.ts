import { isTauri } from "@/hooks/useTauri";

const TAURI_PROCESS_SPECIFIER = "@tauri-apps/" + "plugin-process";

const getTauriProcess = async () => {
  if (!isTauri()) return null;
  try {
    return await import(/* @vite-ignore */ TAURI_PROCESS_SPECIFIER);
  } catch {
    return null;
  }
};

/**
 * Desktop-only helper: clears any registered Service Worker + CacheStorage entries,
 * then forces a hard reload (or relaunch in Tauri when available).
 */
export async function clearDesktopCacheAndReload(): Promise<void> {
  // 1) Best-effort SW unregister
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }

  // 2) Best-effort CacheStorage clear
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }

  // 3) In Tauri, a relaunch is the most reliable way to reset the webview state
  try {
    const process = await getTauriProcess();
    if (process?.relaunch) {
      await process.relaunch();
      return;
    }
  } catch {
    // ignore
  }

  // 4) Fallback
  window.location.reload();
}
