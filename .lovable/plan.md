
# Plan de correction de l'import Excel Planning

## Problème identifié

L'import actuel ne crée des missions QUE pour les jours où une cellule contient du texte (via `isDayActive()`). Tu veux au contraire :
- **Toujours créer 7 missions** (Lun→Dim) pour chaque tournée importée
- Assigner le conducteur uniquement si son nom apparaît dans la cellule du jour correspondant
- Ignorer complètement le filtre `isDayActive()` pour la création des jours

---

## Modifications à apporter

### 1. Fichier `src/utils/planningExcelImport.ts`

**Changement de logique dans `parsePlanningExcel()`** :

Actuellement le code fait :
```
if (!isDayActive(cellValue)) return;  // ← On saute si vide
recurring_days.push(dayIdx);
```

Nouvelle logique :
- On ajoute **toujours tous les jours de 0 à 6** dans `recurring_days`
- On ne garde `day_drivers[dayIdx]` que si la cellule contient un vrai nom de conducteur

**Modification concrète** :
- Remplacer la boucle `dayColumns.forEach(...)` par une logique qui :
  1. Initialise `recurring_days = [0, 1, 2, 3, 4, 5, 6]` directement (toute la semaine)
  2. Ne parse que les noms de conducteurs depuis les colonnes Excel pour remplir `day_drivers`

### 2. Fichier `src/hooks/usePlanning.ts` (fonction `importExcelPlanningWeek`)

**Vérification** : S'assurer que la création itère sur `recurring_days` (qui sera maintenant toujours `[0..6]`) pour générer les 7 missions.

Actuellement le code :
```typescript
const validDays = recurring.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
return validDays.map((dayIdx) => { ... });
```

Ce code est correct et n'a pas besoin de modification.

---

## Résultat attendu

| Avant | Après |
|-------|-------|
| 5 missions (Lun-Ven) car seules ces cellules contenaient du texte | 7 missions (Lun-Dim) systématiquement |
| Conducteur ignoré si nom dans cellule | Conducteur assigné si nom dans cellule du jour |

---

## Détails techniques

### Fichier : `src/utils/planningExcelImport.ts`

```text
Lignes ~263-284 : Refonte de la boucle de parsing des jours

AVANT:
┌────────────────────────────────────────────┐
│ dayColumns.forEach(...)                    │
│   if (!isDayActive(cellValue)) return;     │
│   recurring_days.push(dayIdx);             │
│   ...                                      │
└────────────────────────────────────────────┘

APRÈS:
┌────────────────────────────────────────────┐
│ // Toujours la semaine complète            │
│ recurring_days = [0, 1, 2, 3, 4, 5, 6];    │
│                                            │
│ // Parse les conducteurs depuis Excel      │
│ dayColumns.forEach(...)                    │
│   const driver = extractDriverFromCell();  │
│   if (driver) day_drivers[dayIdx] = driver;│
└────────────────────────────────────────────┘
```

### Comportement de l'import

1. Lecture du fichier Excel
2. Détection des colonnes "Lundi", "Mardi", etc.
3. Pour chaque ligne de tournée :
   - On force `recurring_days = [0, 1, 2, 3, 4, 5, 6]`
   - On lit les noms de conducteurs dans chaque colonne jour
   - On crée `day_drivers[dayIdx] = "Nom Conducteur"` si présent
4. Dans `usePlanning.importExcelPlanningWeek()` :
   - On crée 7 entrées `planning_entries` (une par jour)
   - Chaque entrée a `driver_id` si `day_driver_ids[dayIdx]` existe, sinon `null`

---

## Impact sur l'interface

- La ligne "Non assigné" contiendra les 7 missions de chaque tournée
- Le nom du conducteur sera affiché dans chaque cellule s'il a été extrait de l'Excel
- L'utilisateur pourra ensuite modifier les conducteurs jour par jour en cliquant sur les cellules
