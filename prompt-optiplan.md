# Prompt Lovable — Créer « OptiPlan » (copie de pages OptiFlow + comptes partagés)

> But : OptiPlan doit **réutiliser à l'identique les pages d'OptiFlow** (mêmes écrans, mêmes composants) et **se connecter avec les comptes créés dans OptiFlow** (l'app direction). Aucun compte n'est créé dans OptiPlan : on se connecte uniquement avec les identifiants gérés côté direction.

---

## Étapes de connexion (à faire dans le nouveau projet)

1. Crée un nouveau projet Lovable (nom : **OptiPlan**).
2. Colle le prompt ci-dessous (bloc entre `=====`) dans le chat.
3. Connecte l'**intégration Supabase** au projet **existant** `zlesqkxvydmljcctnrez` (et NON un nouveau Cloud).
4. Renseigne les 2 variables d'environnement :
   - `VITE_SUPABASE_URL = https://zlesqkxvydmljcctnrez.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZXNxa3h2eWRtbGpjY3RucmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc5MDUsImV4cCI6MjA4NDM5MzkwNX0.7p2e3mYps2f7j-vXsKRALxJs74PxOiOtphG6bZxP3DI`

> Comme les deux apps pointent vers la **même base** et le même système d'authentification, tout compte créé dans OptiFlow (gestion d'équipe / direction) peut se connecter directement à OptiPlan, sans inscription.

---

## ===== PROMPT À COLLER =====

Crée « **OptiPlan** », l'app **exploitation & planning** de la suite **OptiGroup** (transport poids lourds). Stack imposée, identique à OptiFlow : **React 18 + Vite + TypeScript + Tailwind + shadcn/ui**.

L'objectif est simple : **reprendre à l'identique certaines pages déjà existantes dans OptiFlow** (mêmes écrans, mêmes composants, mêmes hooks) et les faire fonctionner sur **le même backend partagé**, avec **les mêmes comptes**.

### 1) Backend partagé (CRITIQUE — ne PAS créer de nouveau backend)
Connecte l'app au projet **Supabase existant** d'OptiFlow via l'intégration Supabase :
- `VITE_SUPABASE_URL = https://zlesqkxvydmljcctnrez.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZXNxa3h2eWRtbGpjY3RucmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc5MDUsImV4cCI6MjA4NDM5MzkwNX0.7p2e3mYps2f7j-vXsKRALxJs74PxOiOtphG6bZxP3DI`

N'altère AUCUN schéma, RLS, fonction, trigger ou table : OptiPlan **consomme** la base existante, il ne la restructure pas. Isolation stricte par `license_id` sur chaque requête et chaque abonnement temps réel.

### 2) Comptes & connexion (les MÊMES identifiants que l'app direction)
- **Aucune création de compte dans OptiPlan.** Pas de page d'inscription, pas de création d'utilisateur, pas de gestion d'équipe, pas d'abonnement, pas de facturation. Tout cela reste **exclusivement** dans OptiFlow (direction).
- Page de connexion **uniquement** : **email/mot de passe + Google**, branchée sur le **même** projet d'auth. Les comptes créés dans OptiFlow (table `company_users`, gérée par la direction) se connectent ici **avec les mêmes identifiants**.
- Après connexion, récupère licence + rôle via l'Edge Function existante **`validate-license`** (renvoie `license_id` + rôle : `direction` / `exploitation` / `membre`) — exactement comme OptiFlow.
- Reprends à l'identique le `LicenseContext` / `useLicense` d'OptiFlow pour résoudre `license_id`, `authUserId` et `userRole`.
- Confidentialité (non négociable) : n'affiche **JAMAIS** de prix, tarifs, devis, marges, CA ou salaires. Respecte les flags `exploitation_metric_settings` et `user_feature_overrides` (lus en temps réel). Rôles `exploitation` et `membre` : aucune donnée financière.

### 3) Pages à reprendre à l'identique depuis OptiFlow
Copie les écrans suivants **tels quels** (mêmes pages, composants et hooks). Garde les mêmes noms de fichiers pour faciliter le copier-coller :

- **Planning** — `src/pages/Planning.tsx` + tout `src/components/planning/*` (AddTourDialog, PlanningCell, PlanningEntryDialog, PlanningFilters, PlanningRowDetailPanel, DriverSearchSelect, UncreatedDriversBanner, ImportPlanningDialog, DuplicateWeeksDialog, BackgroundImportIndicator) + `usePlanning`, `useUncreatedDrivers`, `PlanningImportContext`, `planningExcelImport`, `odmAddressParser`.
- **Conducteurs / Absences** — `src/pages/Drivers.tsx` + `src/components/drivers/*` (DriverAbsenceManager, DriverAbsencesTab, DeclareAbsenceDialog, DriverAssignmentDialog, DriverGrid, DriverTable, ImportDriversDialog, AutoImportDrivers) + `useDriverAbsences`, `useCloudDrivers`, `useUncreatedDrivers`.
- **ODM (ordres de mission)** — la partie ODM utilisée dans le planning + `odmAddressParser` + Edge Function existante `rewrite-mission-order` (réécriture IA des consignes via Lovable AI Gateway / Gemini, sans clé externe).
- **Création de ligne IA (RSE)** — `src/pages/LineMontage.tsx` + `src/components/ai/LineMontageTab.tsx`, `VisualSchedule`, `AIRouteMap`, `LoadTourDialog`, `QuickDriverDialog`.
- **Composants & utilitaires partagés nécessaires** : `SearchableSelect` (pattern dropdown), `VirtualizedGrid`, `useRealtimeSync`, `useRealtimeNotifications`, `productionLogger`, et le `tourCostCalculation` **uniquement** pour les calculs opérationnels (sans afficher de montants financiers).

Reprends aussi le **design system** d'OptiFlow (tokens HSL dans `index.css` + `tailwind.config.ts`, jamais de couleurs en dur), la **sidebar** (en ne gardant que les groupes Planning / Conducteurs / IA) et le `MainLayout`.

### 4) Tables utilisées (noms EXACTS du backend partagé)
- **Écriture** : `planning_entries` (⚠️ c'est bien `planning_entries`, PAS `planning`), `driver_absences`.
- **Lecture seule (référentiel partagé, édité dans OptiFlow)** : `saved_tours`, `user_drivers`, `clients`, `client_addresses`, `client_contacts`, `company_users` (membres/rôles), `exploitation_metric_settings`, `user_feature_overrides`, `notifications`.
- Ne duplique pas le référentiel : véhicules, conducteurs et clients sont **édités côté direction** et seulement lus ici.

Colonnes utiles de `planning_entries` : `planning_date`, `start_time`, `end_time`, `client_id`, `driver_id`, `vehicle_id`, `mission_order`, `origin_address`, `destination_address`, `tour_name`, `status`, `recurring_days`, `is_all_year`, `start_date`, `end_date`, `relay_driver_id`, `relay_location`, `relay_time`, `parent_tour_id`, `sector_manager`, `stops` (jsonb), `saved_tour_id`, `line_reference`, `return_line_reference`, `notes`, `user_id`, `license_id`.
Colonnes utiles de `driver_absences` : `driver_id`, `absence_type`, `start_date`, `end_date`, `notes`, `user_id`, `license_id`.

### 5) Temps réel (synchro live avec OptiFlow)
- Reprends le hook `useRealtimeSync` : abonnements `postgres_changes` (event `*`) sur les tables ci-dessus, **filtrés `license_id=eq.<licenseId>`**.
- Toutes ces tables sont déjà en `REPLICA IDENTITY FULL` et publiées dans `supabase_realtime` côté backend.
- Pattern anti-collision (`inFlightRef`) pour ne pas écraser une écriture locale par un écho temps réel.
- **Toasts** quand un actif partagé est modifié par un autre membre de l'entreprise (ex. nouvelle absence, mission réaffectée).
- Toujours typer les timers avec `ReturnType<typeof setTimeout>`.

### 6) Bonnes pratiques imposées (identiques à OptiFlow)
- Hooks cloud pour toutes les entités opérationnelles (pas de stockage local de la vérité).
- Pas de `console.log` brut : wrapper `productionLogger` qui se tait en production.
- Sécurité : s'appuyer sur les RLS existantes (chaque insert renseigne `user_id = auth.uid()` et le `license_id` de l'utilisateur).
- **Aucune navigation croisée** vers OptiFlow/OptiFleet, **aucun écran** de facturation/abonnement/gestion de comptes.

## ===== FIN DU PROMPT =====

---

## Note sur le copier-coller des pages
Lovable ne peut pas « importer » automatiquement les fichiers d'OptiFlow dans le nouveau projet : il faut soit laisser le prompt recréer ces pages à l'identique, soit, pour un copier-coller exact, **coller le contenu des fichiers** listés en partie 3 dans le chat OptiPlan (un fichier = un message, en gardant le même chemin). Les deux approches aboutissent au même résultat puisque le backend, les comptes et les tables sont partagés.

## Après validation d'OptiPlan (côté OptiFlow, plus tard)
Une fois OptiPlan vérifié, on nettoiera OptiFlow : retrait des pages déplacées (Planning, Absences, ODM, création de ligne IA), tout en gardant la **lecture** des référentiels via les hooks cloud existants.