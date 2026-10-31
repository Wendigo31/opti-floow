import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeMode } from "./lib/themeMode";
import { recordRecentErrors } from "./lib/support";

// Thème jour / nuit appliqué avant le premier affichage (identique dans les 3 logiciels).
initThemeMode();
// Dernières erreurs de la page, jointes à un signalement de bug (Support).
recordRecentErrors();
import { captureCompanySlug } from "./lib/companyLink";

// Lien de la société (?societe=…) gardé pour la session.
captureCompanySlug();
import { clearAllCaches } from "./utils/clearAllCaches";
import { installProductionLogger } from "./utils/productionLogger";
import {
  SupportSessionBanner,
  SupportSessionStart,
  isSupportSessionPath,
} from "@/components/supportSession";

// Silence verbose logs in production builds
installProductionLogger();

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
const CACHE_VERSION = "v2";
const lastCacheVersion = localStorage.getItem("optiflow_cache_version");
if (lastCacheVersion !== CACHE_VERSION) {
  clearAllCaches();
  localStorage.setItem("optiflow_cache_version", CACHE_VERSION);
  console.log("[Cache] Cleared all caches for version", CACHE_VERSION);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSupportSessionPath() ? (
      <SupportSessionStart app="flow" />
    ) : (
      <>
        <SupportSessionBanner />
        <App />
      </>
    )}
  </React.StrictMode>,
);

// Écran de lancement (index.html) : retiré en fondu une fois l'application montée.
const hideAppLoader = () => {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => loader.remove(), 500);
};
setTimeout(hideAppLoader, 600);
