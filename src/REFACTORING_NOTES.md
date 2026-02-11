# Refactorisation : useCloudDrivers et Drivers.tsx

## Architecture

### Hook refactorisé en modules

Le hook `useCloudDrivers` (552 lignes) a été découpé en 4 modules spécialisés :

#### 1. **useDriverCache.ts** (Cache management)
- Gère le localStorage pour la persistance hors-ligne
- Interface simple : `cache`, `persist()`, `clear()`
- Découplée de Supabase et de la logique métier

#### 2. **useDriverCRUD.ts** (Database operations)
- Crée, met à jour, supprime les conducteurs
- Gère les insertions par batch (chunks de 50)
- Sépare les opérations DB de la gestion d'état UI
- Gère les erreurs RLS et les fallbacks via `delete_company_driver()`

#### 3. **useDriverRealtime.ts** (Real-time sync)
- Souscription Realtime à la table `user_drivers`
- Handlers découplés des composants
- Refetch automatique après subscribe
- Réconciliation des DELETE avec fallbacks sur `local_id`

#### 4. **index.ts** (Orchestration)
- Compose les 3 modules précédents
- Gère les refs pour éviter les fermetures sur état obsolète
- Expose l'API publique stable

### Composants extraits de Drivers.tsx

| Composant | Rôle | Lignes |
|-----------|------|-------|
| **DriverForm.tsx** | Formulaire création/édition CDI/CDD/Intérim | ~80 |
| **DriverTable.tsx** | Affichage liste avec sélection multi | ~70 |
| **DriverGrid.tsx** | Affichage grille avec cards interactives | ~75 |
| **DriverBulkActions.tsx** | Barre d'actions sélection/fusionner/supprimer | ~70 |

### Tests

Tests unitaires ajoutés pour valider :
- **useDriverCache**: chargement localStorage, persistance, clear
- **useDriverCRUD**: create, batch insert, update, delete
- **DriverForm**: affichage, validation input, callback save/cancel
- **DriverTable**: rendu données, sélection, actions

## Migration de Drivers.tsx

La page `Drivers.tsx` utilise maintenant les nouveaux composants et hook:

```typescript
// Avant (monolithique)
const { cdiDrivers, cddDrivers, interimDrivers, ... } = useCloudDrivers();
// logique formulaire inline
// rendu table inline
// 1494 lignes

// Après (composé)
const { cdiDrivers, ... } = useCloudDrivers();
<DriverForm {...} />
<DriverTable {...} />
<DriverBulkActions {...} />
// ~300 lignes (futur refactoring complet)
```

## Bénéfices

✅ **Testabilité**: Chaque module peut être testé isolément  
✅ **Maintenabilité**: Séparation des préoccupations claire  
✅ **Réutilisabilité**: DriverTable, DriverForm peut être utilisé ailleurs  
✅ **Stabilité**: Moins de bugs de fermeture et de race conditions  
✅ **Performance**: Cache optimisé, batch operations scalables  

## Fichiers modifiés

- `src/hooks/drivers/` - Nouveaux modules refactorisés
- `src/components/drivers/` - Nouveaux composants
- `src/hooks/useCloudDrivers.ts` - Alias pour retrocompatibilité
- Tests: `src/hooks/drivers/__tests__/`, `src/components/drivers/__tests__/`

## Prochaines étapes

1. Refactorer complètement `Drivers.tsx` pour utiliser les composants
2. Ajouter plus de tests d'intégration
3. Documenter les patterns de gestion d'état
