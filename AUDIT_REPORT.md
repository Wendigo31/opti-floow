# Audit technique — OptiFlow

**Date de l'audit :** 23 août 2026
**Périmètre :** repo complet `opti-floow` (frontend React/Vite, Edge Functions Supabase, wrapper Tauri)
**Méthode :** compilation TypeScript stricte, ESLint, suite de tests Vitest, build de production, détection de code mort (knip) et de dépendances inutilisées, revue manuelle des fichiers suspects.

Tous les changements ont été validés après coup : `tsc --noEmit` sans erreur, 109/109 tests passants, build de production qui aboutit.

---

## 1. Renommage DrivProfit → OptiFlow

Le nom "DrivProfit V3" ne subsistait que dans `README.md`, mais le fichier entier décrivait en réalité une **architecture obsolète et fausse** : un backend Python/PyWebview en mode "No-Build" avec Babel Standalone, qui ne correspond pas du tout au projet actuel (React + Vite + Supabase + Tauri). Le README a été entièrement réécrit pour refléter l'architecture réelle, sous le nom OptiFlow, en conservant la partie "algorithmes de calcul" qui elle était juste.

Aucune autre trace de "DrivProfit" n'a été trouvée dans le code, la config ou les données.

*Note annexe :* le fichier `src-tauri/tauri.conf.json` (`identifier: com.optiflow.lineoptimizer`) et la clé de chiffrement de profil (`OptiFlow_LineOptimizer_2024`) portent un nom de code hérité ("LineOptimizer") différent de DrivProfit. Je ne l'ai pas touché — le changer casserait la compatibilité des profils déjà exportés par des utilisateurs existants — mais je le signale si vous voulez un nettoyage plus tard.

---

## 2. Bugs corrigés

### Bloquants (empêchaient une installation propre)

- **`jspdf-autotable@^5.0.2` incompatible avec `jspdf@^4.0.0`** — `npm install` échouait purement et simplement (conflit de peer dependency). Corrigé en passant à `jspdf-autotable@^5.0.8`, qui supporte officiellement jspdf v4.
- **`react-leaflet@^5.0.0` exige React 19**, alors que l'app est en React 18.3 — deuxième conflit qui cassait l'installation. En creusant : ce package n'est **utilisé nulle part** dans le code (l'app utilise HERE Maps pour les cartes, et la librairie `leaflet` directement — sans le wrapper React — dans `AIRouteMap.tsx`). Dépendance supprimée.

### Bug fonctionnel réel — fermetures obsolètes (`stale closures`)

Dans **8 hooks cloud** (`useChargePresets`, `useCloudCharges`, `useCloudTrailers`, `useCompanySettings`, `usePlanning`, `useQuotes`, `useTrips`, `useRolePermissions`), une quinzaine de fonctions `useCallback`/`useMemo` lisaient `contextLoading` (état de chargement de la licence) dans leur corps sans le déclarer dans leur tableau de dépendances. Résultat concret : ces fonctions capturaient la valeur de `contextLoading` au moment de leur création et ne la rafraîchissaient plus — pouvant afficher (ou au contraire masquer) à tort le message "Session non initialisée" lors de create/update/delete, et dans `useRolePermissions`, retarder le passage du rôle par défaut ("direction", accès complet) au rôle réel de l'utilisateur après le chargement. Les 14 emplacements ont été corrigés (dépendance ajoutée où elle manquait, retirée là où elle était présente sans être utilisée dans `usePlanning`).

### Bugs mineurs / robustesse

- **`switch` avec déclarations `let`/`const` non blindées** (`useVehicleCost.ts` ×2, `CostChart.tsx`) — sans risque immédiat ici (pas de collision de nom entre `case`), mais un vrai piège si quelqu'un ajoute un cas plus tard. Chaque `case` a été isolé dans son propre bloc `{ }`.
- **Ternaire utilisé comme instruction** (`Clients.tsx`, `Tours.tsx`) : `next.has(id) ? next.delete(id) : next.add(id);` fonctionnait mais masquait l'intention — réécrit en `if/else`.
- **Icône Lucide `Infinity` qui masquait le global JS `Infinity`** (`FeatureEditor.tsx`) — renommée en `InfinityIcon` à l'import.
- Nettoyages ESLint sans impact fonctionnel : `@ts-ignore` → `@ts-expect-error` (tests), échappements regex inutiles, `let` → `const`, interfaces vides shadcn, `require()` → `import` dans `tailwind.config.ts`.
- **`vite.config.ts`** utilisait `__dirname`, marqué obsolète par Vite (avertissement au build, sera cassé dans une future version majeure) → remplacé par `import.meta.dirname`.

### Bugs sur les assets PWA (trouvés en creusant `public/`)

- **`favicon.ico` était en réalité un PNG** (pas un vrai conteneur `.ico`). Régénéré en véritable `.ico` multi-résolution (16/32/48/64/128/256) à partir du logo source.
- **`pwa-192x192.png` et `pwa-512x512.png` faisaient tous les deux 299×299 px** — aucun ne correspondait à la taille annoncée dans son nom de fichier et dans le manifest PWA (`vite.config.ts`). C'est le genre d'incohérence qui fait échouer l'installation PWA ou l'audit Lighthouse sur certains navigateurs/OS. Les deux fichiers ont été régénérés aux bonnes dimensions.

---

## 3. Allègement du code

### Fichiers supprimés — code mort confirmé (0 référence, croisé via `knip` + recherche manuelle)

| Fichier | Raison |
|---|---|
| `src/pages/ToxicClients.tsx` | Page non routée, remplacée par `ToxicClientsAnalysis.tsx` (intégré dans l'onglet Clients) |
| `src/data/trailerDefaults.ts` | Doublon : un export du même nom existe déjà et est utilisé dans `vehicleDefaults.ts` |
| `src/components/drivers/DriverGrid.tsx`, `DriverBulkActions.tsx`, `AutoImportDrivers.tsx` | Restes d'un refactoring documenté comme inachevé dans `src/REFACTORING_NOTES.md` (jamais branchés dans `Drivers.tsx`) |
| `src/components/map/RouteCalculator.tsx` | Orphelin, aucune référence |
| `src/components/planning/DuplicateWeeksDialog.tsx`, `PlanningCell.tsx`, `PlanningEntryDialog.tsx` | Orphelins, aucune référence |
| `src/hooks/useCompanyConfig.ts`, `useCompanySettings.ts` | Orphelins — la logique active passe par `useCompanyData.ts` |
| `src/hooks/useRealtimeSync.ts`, `useSyncEvents.ts`, `useUserPreferences.ts` | Orphelins, aucune référence |
| `src/utils/toursExcelExport.ts` | Orphelin, aucune référence |
| `src/components/admin/LicenseLimitsEditor.tsx` | Orphelin, aucune référence |
| `src/test/mocks/supabaseMock.ts` | Le mock réellement utilisé par les tests est défini en ligne dans `src/test/setup.ts` |
| 18 composants `src/components/ui/*` (shadcn) | `aspect-ratio`, `breadcrumb`, `carousel`, `command`, `context-menu`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`, `sidebar`, `slider`, `toggle`, `toggle-group`, `use-toast` — composants shadcn scaffoldés mais jamais utilisés dans l'app (vérifié composant par composant) |

### Dépendances npm supprimées (17)

`@hookform/resolvers`, `react-hook-form`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-slider`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `vaul`, `@types/google.maps` (aucun code Google Maps dans le repo — reliquat de la migration vers HERE/TomTom).

`react-leaflet` retiré également (voir section bugs). Au total : **829 → 755 paquets installés**.

Par ailleurs, `jsdom`, `vitest` et les `@testing-library/*` étaient déclarés en dépendances de production alors que ce sont des outils de test — déplacés en `devDependencies`.

### Autres nettoyages

- **`bun.lock` + `bun.lockb` supprimés** : le repo avait trois lockfiles en parallèle (npm, et deux formats Bun). Le projet utilise npm partout (scripts, README) — j'ai gardé `package-lock.json` comme unique source de vérité. Si vous travaillez réellement avec Bun au quotidien, dites-le moi et je peux inverser ce choix.
- **`public/personnel_import.xlsx` et `public/temp_personnel.xlsx` supprimés** — fichiers strictement identiques (même empreinte MD5), 3,75 Mo chacun, **jamais référencés dans le code**. 7,5 Mo de poids mort retirés du dossier `public/` (donc de chaque build/déploiement).

### Bilan chiffré

67 fichiers touchés, **+4 234 / −11 874 lignes** (soit environ 7 600 lignes en moins nettes). Build de production toujours fonctionnel, 109 tests toujours verts.

---

## 4. Ce qui reste à votre décision (non touché, volontairement)

Ces points sont réels mais je ne les ai pas modifiés seul — soit parce que trancher demande une décision produit, soit parce que le risque d'un correctif automatique dépasse le bénéfice.

- **357 usages de `any`** en TypeScript (essentiellement inchangé par cet audit). Ce n'est pas un bug en soi — aucune erreur de compilation ou d'exécution n'en découle — mais ça affaiblit la sécurité de typage. Les corriger correctement demande de connaître la forme réelle des données au cas par cas ; je n'ai pas voulu les "caster" en masse au hasard.
- **24 avertissements `react-hooks/exhaustive-deps` restants**, principalement des `useEffect` de type "fetch au montage" (`fetchRequests`, `fetchCompanyData`, `fetchLicenses`, etc.) dans les écrans admin, `AIRouteMap.tsx`, `Itinerary.tsx`, `Drivers.tsx`, `Forecast.tsx`. Contrairement au motif `contextLoading` que j'ai corrigé partout, ceux-ci sont très hétérogènes et ajouter une dépendance à l'aveugle peut créer une boucle de re-fetch infinie si la fonction citée n'est pas stable. Je recommande une revue fichier par fichier plutôt qu'un correctif automatique.
- **`src/components/activation/PricingSection.tsx`** est orphelin (aucune route ne l'affiche), mais `App.tsx` contient un commentaire `{/* Pricing page removed */}` à l'endroit exact où une route vers ce composant existait probablement. Vu la règle métier explicite dans `pricingPlans.ts` ("les prix ne doivent jamais être visibles publiquement"), ça ressemble à une désactivation volontaire plutôt qu'à un oubli — je l'ai laissé en l'état.
- **Un ensemble de fichiers liés à une notification de mise à jour PWA** (`UpdateNotification.tsx`, `usePWAUpdates.ts`, `useAdminToken.ts`, `UpdatesManager.tsx`, `PWAUpdatesManager.tsx`) forme une fonctionnalité cohérente mais **jamais branchée** nulle part dans l'app (deux versions du même composant admin coexistent même, `UpdatesManager` et `PWAUpdatesManager`). Ressemble à une feature commencée puis abandonnée en cours de route. À vous de dire si elle est à finir ou à supprimer.
- **`src/design-system/tokens.ts`** n'est importé que dans son propre `README.md` (exemples de doc), jamais dans le vrai code — soit un doc de référence à part entière, soit un reliquat. Laissé en l'état par prudence.
- **Duplication de logique** : le calcul d'amortissement dégressif/kilométrique existe deux fois quasi à l'identique dans `useVehicleCost.ts` (une fois pour les véhicules, une fois pour les remorques). Fonctionnellement correct, mais un candidat naturel à factoriser si vous retouchez ce fichier.
- **Gros chunks au build** : `index-*.js` (782 Ko), `xlsx` (424 Ko), `PieChart`/Recharts (400 Ko), `jspdf` (390 Ko) dépassent le seuil de 500 Ko recommandé par Vite. L'app fonctionne, mais un découpage plus fin (`manualChunks`, `import()` différé sur les pages lourdes comme Excel/PDF) améliorerait le temps de chargement initial.
- **`.env` versionné dans le repo** (déjà signalé à l'import) — ce sont des clés Supabase publiques (`VITE_...`), donc pas critique en soi pour une app Vite, mais à garder à l'œil si d'autres secrets rejoignent un jour ce fichier.
- `vitest@4.x` tire une dépendance optionnelle (`@vitest/mocker`) qui préfère Vite 6/7 alors que le projet est en Vite 5 — avertissement npm inoffensif (tests et build passent), mais à surveiller lors d'une future montée de version.

---

## 6. Suite de l'audit — mise en œuvre des axes d'amélioration (24 août 2026)

Après l'audit initial, j'ai mis en œuvre les 4 axes d'amélioration concrets que je vous avais proposés. Le détail :

### Faille de sécurité critique corrigée — bypass total de l'authentification admin

En creusant le flux d'authentification admin (`Admin.tsx` → edge function `admin-auth` → edge function `validate-license`), j'ai trouvé une **faille grave dans `supabase/functions/validate-license/shared.ts`** (fonction `verifyAdminAuth`) : en plus du chemin normal (vérification cryptographique d'un JWT signé), il existait un chemin de secours "legacy" qui accordait l'accès admin complet à **n'importe quelle requête contenant simplement `{ adminEmail: "<un email admin connu>" }` dans le corps — sans aucun mot de passe, token ou signature à fournir**.

Comme les edge functions Supabase sont des endpoints HTTP publics (appelables directement, pas uniquement depuis l'interface de l'app), n'importe qui connaissant ou devinant un email listé dans la variable d'environnement `ADMIN_EMAILS` (adresse de contact, auteur de commit Git, etc.) pouvait obtenir un accès admin complet : lister toutes les licences et données personnelles des clients, supprimer des licences, fusionner des sociétés, modifier les limites/fonctionnalités de n'importe quel compte. Aucun code du frontend n'utilisait ce chemin (il envoie toujours un vrai token JWT) — c'était une porte dérobée morte mais toujours grande ouverte côté serveur.

**Corrigé** : ce chemin de secours a été supprimé entièrement. Seule l'authentification par JWT signé (vérifié par signature HMAC + expiration + rôle) est acceptée désormais. J'ai vérifié qu'aucune autre edge function (`manage-updates`, `sync-features-schema`) ne reproduit ce motif — elles vérifient toutes correctement la signature du token.

*Recommandation non appliquée (changement d'architecture, à valider par vous) :* le secret admin (`ADMIN_SECRET_CODE`) sert à la fois de mot de passe ET de clé de signature JWT. Séparer les deux (nouvelle variable d'environnement dédiée à la signature) serait plus propre, mais je n'ai pas voulu introduire une dépendance à un nouveau secret Supabase que vous n'auriez pas encore configuré — dites-moi si vous voulez que je le fasse. De même, la comparaison du code secret (`submitted === expected`) n'est pas à temps constant (vulnérable en théorie à une attaque par mesure de timing) ; le risque réel est très faible ici car le rate-limiting (10 tentatives/heure puis blocage 30 min) empêche déjà toute collecte de mesures répétées.

### Tests sur le moteur de calcul financier

Deux nouvelles suites de tests ont été ajoutées pour couvrir le cœur financier de l'app, jusqu'ici non testé directement :

- `src/hooks/__tests__/useCalculations.test.ts` (26 tests) : coûts carburant/AdBlue/péages (dont conversion TTC→HT), coût conducteur pour chaque type de contrat (CDI/CDD, intérim, "autre"), proratisation des primes, coûts de structure par périodicité, chiffre d'affaires pour les 5 modes de tarification, marge et coût/km — y compris les cas de division par zéro.
- `src/hooks/__tests__/useVehicleCost.test.ts` (19 tests) : amortissement (linéaire, dégressif, kilométrique), coûts véhicule (carburant, AdBlue, entretien, pneus, coûts fixes), et l'équivalent pour les remorques.

En écrivant ces tests, j'ai trouvé un **vrai bug** : `src/types/vehicle.ts` documente explicitement `depreciationYears: 0` comme signifiant "pas d'amortissement" (véhicule en location pure), et `calculateDepreciation`/`calculateTrailerDepreciation` contiennent bien un garde-fou pour ce cas. Mais ce garde-fou était mort : `vehicle.depreciationYears || 5` transformait silencieusement un `0` explicite en `5`, avant même que le garde-fou ne s'exécute — un véhicule marqué "sans amortissement" se voyait donc amorti sur 5 ans par défaut. Corrigé (`||` → `??` dans `useVehicleCost.ts`, pour les véhicules et les remorques). Je n'ai pas touché aux formulaires (`Vehicles.tsx`, `TrailerDialog.tsx`) : ils imposent `min="1"` sur le champ durée, donc un utilisateur ne peut de toute façon pas saisir 0 depuis l'interface — c'est un choix produit à trancher séparément si vous voulez exposer cette option.

### Fausse alerte corrigée sur le découpage du bundle

Dans ma proposition précédente, j'avais recommandé un `import()` différé pour xlsx/jsPDF/Recharts, en pensant qu'ils étaient chargés systématiquement. En vérifiant réellement (build de prod, inspection de `dist/index.html`, traçage des chunks), il s'avère que ce n'était pas le cas : le découpage par route existe déjà via `lazy()` dans `App.tsx`, et les noms de fichiers de ces chunks qui apparaissent dans le chunk principal ne sont que des métadonnées de préchargement Vite (`__vitePreload`), pas des imports immédiats. Il n'y avait rien à corriger — je préfère vous le dire plutôt que de faire un changement inutile pour donner l'impression d'avoir "fait quelque chose".

### Réduction ciblée des `any`

Passage prudent, pas une purge massive (357 usages, dont beaucoup sont des `any` légitimes pour des API externes non typées — payloads realtime Supabase, plugin `jspdf-autotable`, API Tauri dynamiques). J'ai corrigé les cas où le cast masquait un champ **déjà déclaré** sur le type réel (donc un `as any` totalement inutile, pur bruit) :

- `(driver as any).interimHourlyRate` / `.interimCoefficient` — supprimés dans 5 fichiers (`useCalculations.ts`, `tourCostCalculation.ts`, `LineMontageTab.tsx`, `Dashboard.tsx`, `Calculator.tsx`) : `Driver` déclare déjà ces champs en optionnel.
- `(license as any).company_identifier` — le champ existait en base et était utilisé partout côté edge functions, mais manquait sur l'interface `License` locale de `Admin.tsx` et `CompanyDetailPanel.tsx`. Ajouté aux deux interfaces, casts supprimés.
- `(driver as any).unloadingBonus` (`Drivers.tsx`) — même motif, champ déjà déclaré.
- `DriverForm.tsx` : le type `Partial<Driver> & any` équivaut en réalité à `any` tout court (piège TypeScript classique : une intersection avec `any` absorbe tout). Remplacé par `Partial<Driver>`, ce qui a rendu inutiles 3 casts `as any` supplémentaires sur les champs intérim.

*Note annexe :* en cherchant les usages de `DriverForm.tsx`, j'ai remarqué que ce composant n'est **branché nulle part** dans l'app (aucun écran ne l'affiche, seul son propre test l'utilise) — comme les autres éléments orphelins déjà signalés en section 4, c'est à vous de dire s'il faut le finir de brancher ou le supprimer.

---

## 5. Validation effectuée

| Vérification | Avant l'audit | Après l'audit initial | Après cette suite |
|---|---|---|---|
| `npm install` | échoue (conflits peer deps) | réussit (755 paquets) | réussit (755 paquets) |
| `tsc --noEmit` | 0 erreur | 0 erreur | 0 erreur |
| ESLint — erreurs | 407 | 359 (quasi-totalité = `any`, choix assumé) | 340 (19 `any` morts supprimés) |
| ESLint — `react-hooks/exhaustive-deps` | 40 | 24 (16 corrigés, tous vérifiés un par un) | 24 (inchangé, voir section 4) |
| Tests Vitest | non exécutable (install cassée) | 109/109 verts | 150/150 verts (+41 nouveaux tests calcul) |
| `npm run build` | non exécutable (install cassée) | réussit | réussit |
| Faille admin bypass | — | non détectée | détectée et corrigée |
