

# Audit Complet - Conducteurs, Planning, Tournees

## Bugs identifies et corrections a appliquer

### CRITIQUES (bloquants / perte de donnees)

**BUG 1 - CloudDataContext : conducteurs CDD absents du contexte global**
Le `CloudDataContext` expose `cdiDrivers` et `interimDrivers` mais **pas `cddDrivers`**. Toute page utilisant `useCloudData()` pour les conducteurs CDD ne les verra jamais. Le hook `useCloudDrivers` les gere correctement mais le contexte ne les transmet pas.
- Fichier : `src/context/CloudDataContext.tsx` (lignes 48-49 et provider value)
- Correction : Ajouter `cddDrivers` a l'interface et au provider

**BUG 2 - Planning.tsx : conducteurs CDD exclus de la grille**
La page Planning ne recupere que `cdiDrivers` et `interimDrivers` (ligne 71-74). Les conducteurs CDD ne sont jamais affiches ni selectionnables dans le planning.
- Fichier : `src/pages/Planning.tsx` (ligne 71, 74)
- Correction : Ajouter `cddDrivers` a `allDrivers`

**BUG 3 - Tours.tsx : clients lus depuis localStorage au lieu du cloud**
La page Tournees utilise `useLocalStorage<Client[]>('optiflow_clients', [])` (ligne 78) au lieu du hook cloud `useClients()`. Resultat : le filtre client et l'affichage des noms de clients sont vides ou desynchronises.
- Fichier : `src/pages/Tours.tsx` (ligne 78, 185-189, 427-436)
- Correction : Remplacer par `useClients()` du hook cloud

**BUG 4 - Realtime DELETE sur conducteurs : comparaison d'ID incorrecte**
Dans `useCloudDrivers`, le handler DELETE utilise `(payload.old as any).local_id` (ligne 210), mais la table avec REPLICA IDENTITY FULL devrait retourner la row complete. Si `local_id` est absent du payload old (ce qui arrive quand le payload ne contient que les colonnes PK), la suppression en temps reel echoue silencieusement.
- Fichier : `src/hooks/useCloudDrivers.ts` (ligne 210)
- Correction : Utiliser aussi l'id UUID comme fallback : `const localId = (payload.old as any).local_id || (payload.old as any).driver_data?.id`

### MAJEURS (comportement incorrect)

**BUG 5 - Planning : pas de refetch apres creation de tournee**
Apres `createTour()`, le planning ne fait pas de refetch pour afficher les nouvelles entrees. L'utilisateur doit changer de semaine et revenir pour voir le resultat.
- Fichier : `src/pages/Planning.tsx` (ligne 482-483)
- Correction : Ajouter un `fetchEntries()` apres le `createTour`

**BUG 6 - Realtime clients : perte des champs creator lors des updates**
Le handler realtime UPDATE dans `useClients` (ligne 311-329) reconstruit le client sans les champs `creator_email`, `creator_display_name`, `is_own`, `is_former_member`. Ces informations sont perdues apres chaque update realtime.
- Fichier : `src/hooks/useClients.ts` (lignes 311-329)
- Correction : Merger les champs existants au lieu de les ecraser

**BUG 7 - updateEntry dans usePlanning : double serialisation des stops**
Les stops sont serialises avec `JSON.stringify()` (ligne 337) dans `updatePayload`, mais le driver Supabase serialise deja automatiquement les JSONB. Cela peut provoquer des doubles-echappements.
- Fichier : `src/hooks/usePlanning.ts` (lignes 335-337)
- Correction : Supprimer le `JSON.stringify` et passer l'array directement

**BUG 8 - PlanningRowDetailPanel : vehicleId pas re-initialise quand on change de group**
Le `useEffect` qui re-initialise les champs depend de `open` et `first`, mais si l'utilisateur clique sur une autre ligne sans fermer le panel, `open` reste `true` et la ref `first` peut ne pas declencher le re-rendu si elle pointe vers le meme objet.
- Fichier : `src/components/planning/PlanningRowDetailPanel.tsx` (ligne 79-98)
- Correction : Ajouter `first?.id` ou `entries` a la dependance du useEffect

**BUG 9 - usePlanning importExcelPlanningWeek : refetch manquant apres import**
Apres l'import Excel, le hook ne fait pas de `fetchEntries()` lui-meme (il compte sur le composant appelant). Mais le composant ajoute un delai de 500ms (ligne 497) et le refetch peut rater si les ecritures DB ne sont pas encore commitees.
- Fichier : `src/hooks/usePlanning.ts` (lignes 668-693)
- Correction : Ajouter un refetch automatique dans le hook avec un delai adequat

### MINEURS (UX / robustesse)

**BUG 10 - Conducteurs : ID base sur Date.now() peut creer des collisions**
Les conducteurs crees manuellement utilisent `Date.now().toString()` comme ID (ligne 275 de Drivers.tsx). En cas de creation rapide successive, deux conducteurs peuvent recevoir le meme ID.
- Correction : Utiliser `crypto.randomUUID()` ou un compteur unique

**BUG 11 - createDriverInternal : pas de deduplication a l'insertion**
Si un conducteur avec le meme `local_id` existe deja, l'insert echoue avec une erreur DB non geree proprement (pas de conflit upsert).
- Correction : Utiliser `upsert` ou verifier l'existence avant insert

**BUG 12 - Drivers page : 1482 lignes, composant monolithique**
La page est trop large, ce qui rend la maintenance difficile et augmente le risque de regressions.
- Correction : Extraire en sous-composants (DriverForm, DriverCard, DriverTable, DriverBulkActions)

**BUG 13 - Tours page : detail financier visible sans verifier canViewFinancialData**
Le dialog de detail d'une tournee (lignes 643-749) affiche tous les couts et le benefice sans verifier `canViewFinancialData`. Seul le tableau les masque.
- Correction : Wrapper les sections financieres du dialog avec la verification de role

**BUG 14 - useUncreatedDrivers : stocke uniquement en localStorage**
Les conducteurs non crees ne sont pas synchronises entre utilisateurs de la meme entreprise. Un autre membre ne voit pas les conducteurs detectes par un collegue.
- Impact : Mineur pour le moment, a noter pour une future evolution

**BUG 15 - usePlanning fetchEntries : limite de 10 000 rows**
Si une entreprise a plus de 10 000 entrees de planning sur une seule semaine (improbable mais possible sur une longue periode sans filtre date), les donnees seront tronquees.
- Impact : Tres faible, mais a surveiller

---

## Plan de correction priorise

### Phase 1 - Corrections critiques (immediat)
1. Ajouter `cddDrivers` au `CloudDataContext`
2. Inclure les CDD dans `allDrivers` du Planning
3. Remplacer `useLocalStorage` par `useClients()` dans Tours.tsx
4. Securiser le handler DELETE realtime des conducteurs

### Phase 2 - Corrections majeures
5. Refetch planning apres creation de tournee
6. Corriger le handler realtime UPDATE des clients (preserver creator info)
7. Supprimer le double `JSON.stringify` des stops
8. Ajouter `first?.id` aux dependances du useEffect du detail panel
9. Ajouter refetch automatique apres import Excel dans le hook

### Phase 3 - Ameliorations mineures
10. Remplacer `Date.now()` par `crypto.randomUUID()`
11. Ajouter deduplication upsert pour les conducteurs
12. Masquer les donnees financieres dans le dialog detail des tournees
13. Refactorer Drivers.tsx en sous-composants

### Details techniques

Chaque correction est independante et peut etre appliquee sans casser les autres fonctionnalites. L'ordre est optimise pour maximiser la stabilite le plus vite possible.

