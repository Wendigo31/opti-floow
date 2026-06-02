# Découpage en 3 applications connectées (OptiGroup)

## Principe
Les 3 apps partagent **le même backend Supabase** (le projet actuel) → **synchro temps réel** garantie : même base, mêmes tables, isolation par `license_id`, mêmes RLS, même auth (`validate-license`). Identité visuelle OptiGroup commune.

> Les 2 nouvelles apps **NE créent PAS un nouveau Cloud**. Elles se **connectent au Supabase existant** pour rester sur la base commune.

## Rôle de chaque app (selon ta consigne)

```text
APP 1 — OptiFlow = LA DIRECTION (reste l'app actuelle)
  Rentabilité · Prix / Tarifs / Devis · Charges · Prévisionnel
  Analyse financière (Dashboard) · Clients toxiques
  GESTION DES COMPTES : Équipe, rôles, permissions, Admin, Abonnements/Addons
  → C'est ICI, et uniquement ici, que vivent les prix, les marges et la gestion des utilisateurs.

APP 2 — OptiPlan = EXPLOITATION (nouveau prompt)
  Planning · Affectations conducteurs · Absences · Ordres de mission (ODM)
  Création de ligne IA (RSE) · Optimisation IA des tournées
  → AUCUN prix/marge affiché. AUCUNE gestion de comptes (lecture seule du rôle/licence).

APP 3 — OptiFleet = RÉFÉRENTIEL & ITINÉRAIRES (nouveau prompt)
  Véhicules · Remorques · Fiches techniques · Itinéraire/routing
  Conducteurs (référentiel : contrats, taux) · Clients (référentiel : fiches, contacts) · Imports Excel
  → AUCUN prix de vente/marge. AUCUNE gestion de comptes.
```

Règles communes aux 2 apps opérationnelles :
- Pas de module Prix/Tarifs/Devis, pas de Prévisionnel, pas d'écran de gestion des comptes/abonnements.
- Les marges et salaires restent masqués (rôles Exploitation/Membre). Les comptes utilisateurs sont créés et gérés exclusivement dans OptiFlow.
- Le référentiel (véhicules, conducteurs, clients) est **édité dans OptiFleet** et **lu en temps réel** par OptiFlow/OptiPlan.

## Détails techniques (communs)
- Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
- Connexion Supabase partagé : `VITE_SUPABASE_URL=https://zlesqkxvydmljcctnrez.supabase.co` + clé anon publishable du projet.
- Tables partagées : `licenses`, `company_users`, `user_vehicles`, `user_trailers`, `user_drivers`, `user_charges`, `clients`, `saved_tours`, `trips`, `quotes`, `planning`, `driver_absences`, `company_settings`, `search_history`, `user_feature_overrides`.
- Temps réel : `REPLICA IDENTITY FULL` déjà actif ; abonnements `postgres_changes` filtrés `license_id=eq.<id>` (pattern `useRealtimeSync`/`inFlightRef`).
- Auth & rôles : Edge Function `validate-license` (`license_id` + rôle Direction/Exploitation/Membre). Les apps opérationnelles **consomment** la licence, ne créent pas de comptes.

---

## PROMPT LOVABLE #1 — OptiPlan (Exploitation & Planning)

> Crée « OptiPlan », l'app d'exploitation et de planning de la suite OptiGroup (transport poids lourds). Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
>
> BACKEND PARTAGÉ (CRITIQUE) : ne crée PAS un nouveau backend. Connecte l'app au projet Supabase existant via l'intégration Supabase : `VITE_SUPABASE_URL=https://zlesqkxvydmljcctnrez.supabase.co` + clé anon publishable du projet. Toutes les données restent dans cette base commune pour la synchro temps réel avec les autres apps.
>
> AUTH & RÔLES (lecture seule des comptes) : connexion email/mot de passe + Google. Licence validée via l'Edge Function `validate-license` qui renvoie `license_id` et le rôle. OptiPlan ne gère PAS la création/édition des comptes utilisateurs ni les abonnements (cela reste dans OptiFlow) : il se contente de lire le rôle et la licence. Isolation stricte par `license_id`. N'affiche JAMAIS de prix, tarifs, marges ou salaires.
>
> FONCTIONNALITÉS (pages) :
> 1. Planning : grille hebdomadaire (fenêtre 7 jours), recherche d'abord, virtualisation gros volumes, alertes missions non affectées, badges couleur par type de contrat, import Excel en arrière-plan.
> 2. Affectations conducteurs : sélecteur recherchable, détection fuzzy, liaison aux tournées maîtres.
> 3. Absences conducteurs : table `driver_absences`, notifications temps réel à l'équipe.
> 4. Ordres de mission (ODM) : extraction auto des adresses depuis texte brut, réécriture IA des consignes (Lovable AI, sans clé externe).
> 5. Création de ligne IA : montage hebdomadaire conforme RSE (temps de conduite/repos UE), optimisation relais.
>
> DONNÉES (temps réel) : `planning`, `driver_absences`, `saved_tours` (lecture), `user_drivers` (lecture), `clients` (lecture). Ne duplique pas le référentiel.
> TEMPS RÉEL : abonnements `postgres_changes` filtrés `license_id=eq.<id>` (REPLICA IDENTITY FULL déjà en place) + toasts à la modification d'actifs partagés.
> IA : Lovable AI Gateway (Gemini), sans clé externe.
> DESIGN : identité OptiGroup, UI épurée, mode clair/sombre, sidebar par groupes ; pas de lien de navigation croisée vers les autres apps ; pas d'écran de facturation/gestion de comptes.

---

## PROMPT LOVABLE #2 — OptiFleet (Référentiel & Itinéraires)

> Crée « OptiFleet », l'app de gestion de flotte, du référentiel et des itinéraires de la suite OptiGroup (transport poids lourds). Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
>
> BACKEND PARTAGÉ (CRITIQUE) : ne crée PAS un nouveau backend. Connecte l'app au projet Supabase existant : `VITE_SUPABASE_URL=https://zlesqkxvydmljcctnrez.supabase.co` + clé anon publishable. Données dans la base commune pour synchro temps réel.
>
> AUTH & RÔLES (lecture seule des comptes) : email/mot de passe + Google, licence via `validate-license` (`license_id` + rôle). OptiFleet ne gère PAS les comptes utilisateurs ni les abonnements (réservés à OptiFlow). N'affiche PAS de prix de vente/tarifs/marges. Les coûts techniques (€/km, amortissement) ne sont visibles qu'au rôle Direction.
>
> FONCTIONNALITÉS (pages) :
> 1. Véhicules : référentiel (150+ modèles), sous-onglets, 3 modes d'amortissement, specs en JSONB, coût au km (gated Direction).
> 2. Remorques : specs constructeur, type de caisse.
> 3. Rapports véhicules : amortissement de flotte (gated Direction).
> 4. Itinéraire : routing Google Maps (UI), péages Class 4 TomTom, restrictions poids lourds (Overpass), sélecteur d'adresses Google Places, historique cloud (`search_history`).
> 5. Conducteurs (référentiel) : contrats (CDI/CDD/Intérim/Joker/Autre), taux/salaire (gated Direction), automatisation Jour/Nuit, import Excel.
> 6. Clients (référentiel) : fiches, contacts multi-interlocuteurs, import Excel, détection de doublons + fusion.
> 7. Imports : assistant Excel par lots de 50 (délais/timeout), bannière de doublons.
>
> DONNÉES (écriture principale ici, lecture temps réel ailleurs) : `user_vehicles`, `user_trailers`, `user_drivers`, `clients`, `search_history`. Modèle partagé entreprise via `license_id`.
> TEMPS RÉEL : abonnements `postgres_changes` filtrés `license_id=eq.<id>` (REPLICA IDENTITY FULL) + toasts + protection anti-collision (inFlightRef).
> SÉCURITÉ : RLS sur `auth.uid()`, RPC `SECURITY DEFINER` pour opérations sensibles ; ne jamais exposer salaires/marges hors Direction.
> DESIGN : identité OptiGroup, UI épurée, mode clair/sombre, `SearchableSelect` partout, grilles virtualisées ; pas de navigation croisée ; pas d'écran de facturation/gestion de comptes.

---

## Mise en œuvre côté OptiFlow (après validation)
1. Retirer d'OptiFlow les pages déplacées (Planning, Création de ligne, Véhicules, Remorques, Conducteurs CRUD, Clients CRUD, Itinéraire, imports) tout en gardant la **lecture** des référentiels via les hooks cloud existants.
2. Conserver dans OptiFlow : Calculateur, Tournées/Devis, Charges, Prévisionnel, Dashboard financier, Clients toxiques, Équipe, Admin, Paramètres/Abonnements.
3. Nettoyer la sidebar OptiFlow (Direction uniquement).
4. Vérifier `REPLICA IDENTITY FULL` + présence dans `supabase_realtime` pour les tables concernées.
5. QA synchro : éditer un véhicule dans OptiFleet → vérifier la mise à jour temps réel dans OptiFlow et OptiPlan.

> Dis-moi si tu veux déplacer l'Itinéraire vers OptiPlan plutôt qu'OptiFleet, ou réaffecter un module précis, et j'ajuste les prompts.
