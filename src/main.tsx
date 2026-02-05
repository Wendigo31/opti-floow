import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAllCaches } from "./utils/clearAllCaches";

// In Tauri, a previously registered PWA service worker can keep serving an older cached UI
// even after you rebuild the executable. We explicitly unregister + clear caches in desktop builds.
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
if (isTauri) {
  try {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
    }

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        keys.forEach((k) => void caches.delete(k));
      });
    }
  } catch {
    // ignore
  }
}

// One-time cache cleanup (version bump forces re-clear)
const CACHE_VERSION = 'v2';
const lastCacheVersion = localStorage.getItem('optiflow_cache_version');
if (lastCacheVersion !== CACHE_VERSION) {
  clearAllCaches();
  localStorage.setItem('optiflow_cache_version', CACHE_VERSION);
  console.log('[Cache] Cleared all caches for version', CACHE_VERSION);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
