# Créer OptiPlan (Exploitation) connecté au backend partagé en temps réel

## Rappel de cadre
Un projet Lovable = une seule app. **OptiPlan sera un NOUVEAU projet Lovable**, créé en collant le prompt final ci-dessous. Il ne crée PAS de nouveau backend : il se connecte au Supabase existant (`zlesqkxvydmljcctnrez`) pour partager la base et la synchro temps réel avec OptiFlow.

Ce plan livre 2 choses : **(A)** le prompt final prêt à coller + infos de connexion, et **(B)** une migration côté backend partagé pour compléter le temps réel.

---

## Partie A — Prompt final OptiPlan (fichier livrable)

Je crée `prompt-optiplan.md` (téléchargeable) avec, par rapport à la version actuelle de `.lovable/plan.md`, ces corrections/précisions :

- **Nom de table corrigé** : `planning_entries` (et NON `planning`).
- **Clés de connexion exactes** intégrées :
  - `VITE_SUPABASE_URL = https://zlesqkxvydmljcctnrez.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY = <clé anon du projet>` (fournie en clair dans le fichier).
- **Tables utilisées par OptiPlan** précisées :
  - Écriture : `planning_entries`, `driver_absences`.
  - Lecture seule (référentiel) : `saved_tours`, `user_drivers`, `clients`, `client_addresses`, `client_contacts`, `company_users`, `exploitation_metric_settings`, `user_feature_overrides`, `notifications`.
- **Pattern temps réel** : abonnements `postgres_changes` filtrés `license_id=eq.<id>`, hook type `useRealtimeSync` avec `inFlightRef` anti-collision, toasts sur modification d'actifs partagés.
- **Auth & rôles** : email/mot de passe + Google ; licence/rôle via l'Edge Function `validate-license` ; OptiPlan ne crée/édite AUCUN compte ni abonnement ; respect strict de l'isolation `license_id`.
- **Confidentialité** : jamais de prix/tarifs/marges/salaires affichés ; visibilité des métriques pilotée par `exploitation_metric_settings` + `user_feature_overrides` (lus en temps réel).
- **Pages** : Planning (grille 7 jours, recherche d'abord, virtualisation, alertes non-affectés, badges contrat), Affectations conducteurs, Absences, ODM (extraction adresses + réécriture IA via Lovable AI), Création de ligne IA (RSE).
- **Design** : identité OptiGroup (Teal / Orange / Dark Navy), clair/sombre, sidebar par groupes, pas de navigation croisée vers les autres apps.

Je fournis aussi un court bloc « Étapes de connexion » : créer le projet → coller le prompt → connecter l'intégration Supabase au projet existant → renseigner les 2 variables d'env.

## Partie B — Compléter le temps réel (migration sur le backend partagé)

Déjà OK (FULL + publiées) : `planning_entries`, `driver_absences`, `saved_tours`, `user_drivers`, `clients`, `notifications`.

Migration pour ajouter au temps réel ce qui manque (sans toucher aux données) :

- `REPLICA IDENTITY FULL` sur : `company_users`, `client_contacts`, `exploitation_metric_settings`, `user_feature_overrides` (déjà FULL : `client_addresses`).
- Ajout à la publication `supabase_realtime` : `company_users`, `client_addresses`, `client_contacts`, `exploitation_metric_settings`, `user_feature_overrides`.

Objectif : qu'un changement de rôle/permission ou de fiche client effectué dans OptiFlow se reflète **en direct** dans OptiPlan. Aucune modification de RLS, de schéma de données ou de logique métier.

---

## Hors périmètre (volontairement)
- Aucune modification de l'app OptiFlow actuelle (le nettoyage des pages déplacées se fera plus tard, une fois OptiPlan validé).
- Pas de création du projet OptiPlan à ma place (impossible techniquement) — je livre le prompt prêt à coller.

## Détails techniques
- La clé anon est une clé **publishable** : sa présence dans le fichier prompt et dans le code du futur projet est sans risque.
- La migration n'affecte que la réplication/publication ; elle est idempotente (gardes `IF`/`DO` pour éviter les erreurs si une table est déjà publiée).
