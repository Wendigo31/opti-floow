# Roadmap d'amélioration OptiFlow — Court & Moyen terme

Roadmap priorisée sur 4 axes, basée sur l'audit complet (build, scan sécurité, tests, lint) et la mémoire projet. Ordre : débloquer le build, puis protéger les données clients et stabiliser la CI, puis la performance perçue, le confort de développement, et enfin les intégrations business.

---

## Phase 0 — Débloquer le build (immédiat)

Le projet ne compile pas actuellement — 9 erreurs TypeScript :
- 7 appels `update()` Supabase qui passent un objet non typé (`Record<string, any>` / `Record<string, unknown>`) là où le client attend maintenant un type strict : `useChargePresets`, `usePlanning`, `useQuotes`, `useSavedTours`, `useSearchHistory`, `useTrips`, et `pages/Drivers.tsx`. Correction : typer chaque payload avec le type de la table concernée plutôt qu'un enregistrement générique.
- 2 directives `@ts-expect-error` devenues inutiles dans `marketing-no-prices.test.ts` et `no-pricing-import-in-public-routes.test.ts` — à retirer.

Rien d'autre ne peut être validé tant que le build échoue.


## Phase 1 — Sécurité & données sensibles (court terme, bloquant commercialisation)

1. **Protection des salaires et marges** (option A validée : Direction uniquement)
   - Verrouiller `SELECT` sur `user_drivers`, `trips`, `quotes`, `saved_tours` au rôle Direction + propriétaire.
   - Créer des vues/RPC sécurisés qui retournent les données masquées (salaires/marges à `null`) pour Exploitation et Membre.
   - Effet connu et accepté : perte du temps réel Realtime sur ces tables pour les non-Direction.
   - Corriger en même temps les 2 constats « error » du scan de sécurité.
2. **Tests d'intégration RLS** côté client : verrouiller les droits de lecture salaires/marges pour éviter toute régression future.
3. **Réactiver le webhook Stripe** (désactivé récemment) : vérification de signature avec `STRIPE_WEBHOOK_SECRET`, sync `checkout.session.completed` / `invoice.paid` → statut de licence. Sans lui, les accès ne suivent plus les paiements.

## Phase 2 — Qualité & fiabilité (court terme)

4. **Consolider les 17 tests** récemment réparés : ajouter les tests RLS (phase 1) au pipeline, documenter la commande CI.
5. **Réduire la dette de typage** : cibler les ~340 `any` restants par lot de fichiers critiques (hooks cloud, moteur de calcul), sans purge massive.
6. **Factoriser le code dupliqué** : calcul d'amortissement dupliqué véhicules/remorques dans `useVehicleCost.ts`.
7. **Trancher les orphelins** signalés à l'audit : `DriverForm.tsx` (brancher ou supprimer), `PricingSection.tsx`, la fonctionnalité PWA updates non branchée (`UpdateNotification`, `usePWAUpdates`, `UpdatesManager`).

## Phase 3 — Performance (moyen terme)

8. **Affiner le découpage du bundle** : `manualChunks` pour xlsx (424 kB), jspdf (388 kB), Recharts (399 kB) — améliorer le cache navigateur entre déploiements.
9. **Optimiser le chargement initial** : prefetch intelligent des routes probables après login, audit des images (`optiflow-logo.png`).
10. **Mesurer** : ajouter un suivi simple des temps de chargement (Web Vitals) pour objectiver les gains.

## Phase 4 — UX & intégrations (moyen terme)

11. **Onboarding** : fluidifier le parcours post-création de compte (premier véhicule, premier conducteur, premier calcul guidé).
12. **Mobile/responsive** : revue du planning et des formulaires sur petit écran (usage tablette en exploitation).
13. **Emails transactionnels** : branchement Lovable Email pour activation, invitations d'équipe, alertes de marge.
14. **Notifications** : centre de notifications temps réel (déjà en base) à rendre plus visible dans l'UI.

---

## Détails techniques

- **RLS** : vues `security_invoker` ou RPC `SECURITY DEFINER` existants (`get_drivers_with_salary_check`) comme modèle ; aucune migration destructive de données.
- **Stripe** : edge function `stripe-webhook` à recréer (supprimée), entrée à rajouter dans `supabase/config.toml` avec `verify_jwt = false`.
- **Tests** : mocks Supabase chaînables déjà en place ; ajouter `supabase.rpc` aux mocks pour les tests RLS.
- **Bundle** : build Vite — `build.rollupOptions.output.manualChunks` par librairie lourde.

## Hors périmètre (à décider séparément)

- Refonte visuelle majeure ou migration framework.
- Nouvelles fonctionnalités métier (au-delà des finitions d'onboarding).
