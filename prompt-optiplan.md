# Prompt Lovable — Créer « OptiPlan » (Exploitation & Planning)

> Copie tout le bloc ci-dessous (entre les lignes `=====`) et colle-le dans un **NOUVEAU projet Lovable** pour générer OptiPlan. Ne crée PAS de nouveau backend : OptiPlan se connecte au Supabase **existant** et partagé avec OptiFlow.

---

## Étapes de connexion (à faire dans le nouveau projet)

1. Crée un nouveau projet Lovable (nom : **OptiPlan**).
2. Colle le prompt ci-dessous dans le chat.
3. Connecte l'**intégration Supabase** au projet existant `zlesqkxvydmljcctnrez` (et NON un nouveau Cloud).
4. Renseigne les 2 variables d'environnement :
   - `VITE_SUPABASE_URL = https://zlesqkxvydmljcctnrez.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZXNxa3h2eWRtbGpjY3RucmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc5MDUsImV4cCI6MjA4NDM5MzkwNX0.7p2e3mYps2f7j-vXsKRALxJs74PxOiOtphG6bZxP3DI`

> La clé anon ci-dessus est une clé **publishable** : elle est conçue pour être présente dans le code client, sans risque de sécurité (les données restent protégées par les RLS du backend).

---

## ===== PROMPT À COLLER =====

Crée « **OptiPlan** », l'application d'**exploitation et de planning** de la suite **OptiGroup** (transport poids lourds). Stack imposée : **React 18 + Vite + TypeScript + Tailwind + shadcn/ui**.

### Backend partagé (CRITIQUE)
Ne crée PAS un nouveau backend. Connecte l'app au projet **Supabase existant** via l'intégration Supabase :
- `VITE_SUPABASE_URL = https://zlesqkxvydmljcctnrez.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZXNxa3h2eWRtbGpjY3RucmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc5MDUsImV4cCI6MjA4NDM5MzkwNX0.7p2e3mYps2f7j-vXsKRALxJs74PxOiOtphG6bZxP3DI`

Toutes les données vivent dans cette base commune (isolation stricte par `license_id`), pour une **synchro temps réel** avec OptiFlow. N'altère AUCUN schéma, RLS, fonction ou trigger existant : OptiPlan **consomme** la base, il ne la restructure pas.

### Auth & rôles (lecture seule des comptes)
- Connexion **email/mot de passe + Google**.
- Licence et rôle validés via l'Edge Function existante **`validate-license`** (renvoie `license_id` + rôle : `direction` / `exploitation` / `membre`).
- OptiPlan **ne crée et n'édite AUCUN compte utilisateur**, ni rôle, ni abonnement, ni permission (tout cela reste exclusivement dans OptiFlow). Il se contente de **lire** le rôle/la licence.
- Isolation stricte par `license_id` sur chaque requête et chaque abonnement temps réel.

### Confidentialité (non négociable)
- N'affiche **JAMAIS** de prix, tarifs, devis, marges, chiffre d'affaires ou salaires.
- La visibilité des éventuelles métriques opérationnelles est pilotée par les tables **`exploitation_metric_settings`** et **`user_feature_overrides`** (lues en temps réel) : respecte ces flags.
- Rôles `exploitation` et `membre` : aucune donnée financière.

### Tables utilisées (noms EXACTS du backend partagé)
- **Écriture** : `planning_entries` (⚠️ c'est bien `planning_entries`, PAS `planning`), `driver_absences`.
- **Lecture seule (référentiel partagé)** : `saved_tours`, `user_drivers`, `clients`, `client_addresses`, `client_contacts`, `company_users` (membres/rôles), `exploitation_metric_settings`, `user_feature_overrides`, `notifications`.
- Ne duplique pas le référentiel : véhicules, conducteurs et clients sont **édités ailleurs** et lus ici.

Colonnes utiles de `planning_entries` : `planning_date`, `start_time`, `end_time`, `client_id`, `driver_id`, `vehicle_id`, `mission_order`, `origin_address`, `destination_address`, `tour_name`, `status`, `recurring_days`, `is_all_year`, `start_date`, `end_date`, `relay_driver_id`, `relay_location`, `relay_time`, `parent_tour_id`, `sector_manager`, `stops` (jsonb), `saved_tour_id`, `line_reference`, `return_line_reference`, `notes`, `user_id`, `license_id`.
Colonnes utiles de `driver_absences` : `driver_id`, `absence_type`, `start_date`, `end_date`, `notes`, `user_id`, `license_id`.

### Temps réel (synchro avec les autres apps)
- Implémente un hook `useRealtimeSync` qui s'abonne à `postgres_changes` (event `*`) sur les tables ci-dessus, **filtré `license_id=eq.<licenseId>`**.
- Toutes ces tables sont déjà en `REPLICA IDENTITY FULL` et publiées dans `supabase_realtime` côté backend.
- Utilise un pattern anti-collision (`inFlightRef`) pour éviter d'écraser une écriture locale par un écho temps réel.
- Affiche des **toasts** quand un actif partagé est modifié par un autre utilisateur de l'entreprise (ex. nouvelle absence, mission réaffectée).
- Toujours typer les timers avec `ReturnType<typeof setTimeout>`.

### Fonctionnalités (pages)
1. **Planning** : grille hebdomadaire (fenêtre 7 jours glissante), **recherche d'abord** (search-first), virtualisation pour gros volumes (`VirtualizedGrid`, >10k lignes), **alertes des missions non affectées** (bannière récapitulant les jours concernés), **badges couleur par type de contrat** conducteur, import Excel en arrière-plan (lots de 50, délais/timeout), liaison aux tournées maîtres (`saved_tours` via `saved_tour_id` / `parent_tour_id`).
2. **Affectations conducteurs** : `SearchableSelect` pour chaque entité, détection fuzzy des noms, gestion des relais (`relay_driver_id`, `relay_location`, `relay_time`).
3. **Absences conducteurs** : CRUD sur `driver_absences`, notifications temps réel à l'équipe.
4. **Ordres de mission (ODM)** : extraction automatique des adresses depuis un texte brut, **réécriture IA des consignes** pour le conducteur via **Lovable AI Gateway (Gemini, sans clé externe)**.
5. **Création de ligne IA** : montage hebdomadaire de lignes conforme **RSE** (temps de conduite/repos UE), optimisation des relais.

### Design
- Identité **OptiGroup** : palette **Teal / Orange / Dark Navy**, mode clair/sombre, tokens sémantiques HSL dans `index.css` + `tailwind.config.ts` (jamais de couleurs en dur dans les composants).
- Sidebar organisée par groupes (Planning, Conducteurs, IA).
- **Aucune navigation croisée** vers OptiFlow/OptiFleet, **aucun écran** de facturation/abonnement/gestion de comptes.

### Bonnes pratiques imposées
- Hooks cloud pour toutes les entités opérationnelles (pas de stockage local de la vérité).
- Pas de `console.log` brut : wrapper de logging qui se tait en production.
- Sécurité : s'appuyer sur les RLS existantes (chaque insert renseigne `user_id = auth.uid()` et `license_id` de l'utilisateur).

## ===== FIN DU PROMPT =====

---

## Après validation d'OptiPlan (côté OptiFlow, plus tard)
Une fois OptiPlan vérifié, on nettoiera OptiFlow : retrait des pages déplacées (Planning, Absences, ODM, création de ligne IA), tout en gardant la **lecture** des référentiels via les hooks cloud existants.