


# Audit Complet - Conducteurs, Planning, Tournees

## Bugs identifies et corrections a appliquer

### CRITIQUES (bloquants / perte de donnees)

**BUG 5 - Planning : pas de refetch apres creation de tournee**
Apres `createTour()`, le planning ne fait pas de refetch pour afficher les nouvelles entrees. L'utilisateur doit changer de semaine et revenir pour voir le resultat.
- Fichier : `src/hooks/usePlanning.ts` (ligne 450)
- Correction : Ajouter un `fetchEntries()` apres le `createTour`

**BUG 9 - Import Excel : refetch avec delai fragile**
Le refetch apres import utilise un `setTimeout` de 1000ms. Si les ecritures DB ne sont pas commitees a temps, les donnees n'apparaissent pas. De plus, `suspendRealtimeRef` est remis a false dans le finally avant le setTimeout.
- Correction : Attendre le refetch avant de remettre suspendRealtimeRef a false

### MAJEURS (comportement incorrect)

**BUG 13 - Tours.tsx : export PDF ignore canViewFinancialData**
La fonction `exportTourToPDF` genere un PDF avec tous les couts et le benefice sans verifier `canViewFinancialData`. Un utilisateur non-Direction peut exporter et voir les marges.
- Correction : Wrapper les sections financieres du PDF avec la verification de role

**BUG 16 - Drivers.tsx : 1494 lignes, sous-composants non utilises**
Les sous-composants extraits (DriverForm, DriverTable, DriverGrid, DriverBulkActions) ne sont pas utilises. Tout le code est encore inline.
- Correction : Migrer vers les sous-composants existants

**BUG 17 - Planning : Realtime INSERT ne mappe pas les champs complets**
Le handler INSERT fait `payload.new as PlanningEntry` directement sans mapper stops, line_reference, return_line_reference, saved_tour_id.
- Correction : Appliquer le meme mapping que fetchEntries au payload

**BUG 18 - Planning : createTour ne cree pas de saved_tour_id**
Contrairement a importExcelPlanningWeek, createTour ne cree ni ne lie de Tournee sauvegardee. La bidirection planning-tours est cassee pour les tournees manuelles.
- Correction : Appeler createSavedToursFromPlanning apres createTour

### MINEURS (UX / robustesse)

**BUG 19 - Drivers.tsx : handleAssignment ecrit dans des colonnes inexistantes**
Les colonnes assigned_client_id, assigned_city, assigned_tour_ids n'existent pas dans user_drivers. L'operation echoue silencieusement.
- Correction : Supprimer ou ajouter les colonnes

**BUG 14 - useUncreatedDrivers : stockage localStorage uniquement**
Non synchronise entre utilisateurs. A noter pour evolution future.

---

## Bugs deja corriges

| # | Description | Statut |
|---|-------------|--------|
| 1 | CDD absents du CloudDataContext | Corrige |
| 2 | CDD exclus du Planning allDrivers | Corrige |
| 3 | Tours.tsx clients depuis localStorage | Corrige |
| 4 | DELETE realtime conducteurs ID incorrect | Corrige |
| 6 | Realtime clients perte creator info | Corrige |
| 7 | Double JSON.stringify stops | Corrige |
| 8 | PlanningRowDetailPanel vehicleId deps | Corrige |
| 10 | ID Date.now() collisions | Corrige |
| 11 | createDriver sans deduplication | Corrige |

---

## Plan de correction priorise

### Phase 1 - Corrections critiques (immediat)
1. Refetch planning apres createTour
2. Securiser refetch post-import Excel

### Phase 2 - Corrections majeures
3. Proteger export PDF par canViewFinancialData
4. Mapper payloads realtime du planning
5. Appeler createSavedToursFromPlanning apres createTour
6. Migrer Drivers.tsx vers sous-composants

### Phase 3 - Ameliorations mineures
7. Supprimer handleAssignment non fonctionnel
8. Documenter limitation useUncreatedDrivers
