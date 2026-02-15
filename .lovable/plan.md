

# Audit complet OptiFlow - Plan de corrections

## Problemes identifies

### 1. BUG CRITIQUE : useCalculations ne gere pas les conducteurs interim/autre/joker

**Fichier** : `src/hooks/useCalculations.ts` (lignes 28-43)

Le hook `useCalculations` applique la formule CDI/CDD a TOUS les conducteurs sans distinction. Il calcule `baseSalary * (1 + patronalCharges/100)` meme pour les interim, autre et joker. Cela produit des couts errones.

En comparaison, `src/utils/tourCostCalculation.ts` (le moteur centralise) gere correctement ces cas avec des branches specifiques pour `interim` (taux horaire x coefficient), `autre` (cout zero) et `joker`.

**Correction** : Aligner `useCalculations.ts` sur la logique de `tourCostCalculation.ts` pour traiter correctement chaque type de contrat.

---

### 2. BUG : Erreur console - LoadTourDialog ref warning

**Fichier** : `src/components/ai/LoadTourDialog.tsx`

La console affiche : `Function components cannot be given refs. Check the render method of LoadTourDialog.`

Le composant `LoadTourDialog` est un composant fonctionnel passe comme enfant d'un `Dialog` Radix qui tente de lui passer un `ref`. Il doit etre enveloppe avec `React.forwardRef`.

**Correction** : Convertir `LoadTourDialog` en composant `forwardRef` ou wrapper le Dialog correctement.

---

### 3. BUG : SaveTourDialog recoit `costs.revenue` au lieu de `revenueWithVehicle`

**Fichier** : `src/pages/Calculator.tsx` (ligne 1350)

Quand on sauvegarde une tournee, le champ `revenue` est defini a `costs.revenue` (qui n'inclut PAS les couts vehicule/remorque) au lieu de `revenueWithVehicle`. Cela cause un decalage entre ce qui est affiche a l'ecran et ce qui est sauvegarde.

**Correction** : Remplacer `revenue: costs.revenue` par `revenue: revenueWithVehicle` dans le `tourData` du `SaveTourDialog`.

---

### 4. BUG POTENTIEL : Dashboard - hook conditionnel avant useMemo

**Fichier** : `src/pages/Dashboard.tsx` (lignes 58-65)

Le `return` conditionnel a la ligne 58 (`if (!isTeamLoading && !isDirection) return <OperationalDashboard />`) est place AVANT les appels `useMemo` aux lignes 62-80. Cela viole la regle des hooks React (les hooks doivent etre appeles inconditionnellement).

**Correction** : Deplacer le `return` conditionnel APRES tous les `useMemo` et hooks.

---

### 5. AMELIORATION : Bouton "Limite atteinte" redirige vers /pricing qui n'existe plus

**Fichier** : `src/pages/Charges.tsx` (ligne 118, 355)

Quand la limite de charges est atteinte, le bouton redirige vers `/pricing`, mais cette route a ete supprimee (commentaire dans App.tsx : "Pricing page removed"). Cela mene vers la page 404.

**Correction** : Remplacer `navigate('/pricing')` par un `toast.info()` expliquant la limite du forfait, ou rediriger vers `/settings`.

---

### 6. AMELIORATION : Sidebar redirige aussi vers /pricing

**Fichier** : `src/components/layout/Sidebar.tsx` (ligne 173)

Le `handleLockedClick` redirige vers `/pricing` qui n'existe plus.

**Correction** : Remplacer par un toast sans redirection, ou rediriger vers une page existante.

---

### 7. COHERENCE : Le masquage financier du Calculateur est incomplet pour les conducteurs

**Fichier** : `src/pages/Calculator.tsx` (lignes 1090-1138)

La section "Conducteurs selectionnes" affiche le `monthlyEmployerCost` (cout mensuel charge) et le `totalDaily` (cout journalier) pour TOUS les roles, y compris Exploitation et Membre. Ces donnees salariales devraient etre masquees pour les roles non-Direction, conformement a la politique de securite financiere.

**Correction** : Conditionner l'affichage des couts salariaux avec `isDirection || canExploitationView('can_view_driver_cost')`.

---

### 8. COHERENCE : La comparaison de tournee chargee affiche les finances pour tous les roles

**Fichier** : `src/pages/Calculator.tsx` (lignes 440-542)

Le tableau de comparaison "Ancien vs Nouveau" affiche les couts detailles, CA, benefice et marge sans verifier les permissions du role. Un utilisateur `membre` voit tout.

**Correction** : Envelopper le tableau de comparaison dans les conditions de role appropriees.

---

## Plan d'implementation

### Etape 1 : Corriger useCalculations pour les types de contrat (critique)
- Ajouter les branches `interim`, `autre`, `joker` dans la boucle des conducteurs
- Aligner le calcul sur `tourCostCalculation.ts`

### Etape 2 : Corriger le ref warning de LoadTourDialog
- Ajouter `React.forwardRef` au composant ou restructurer le JSX

### Etape 3 : Corriger la sauvegarde de tournee (revenue incorrect)
- Remplacer `costs.revenue` par `revenueWithVehicle` dans le SaveTourDialog du Calculator

### Etape 4 : Corriger le hook conditionnel dans Dashboard
- Deplacer le return conditionnel apres tous les hooks

### Etape 5 : Supprimer les redirections vers /pricing
- Charges.tsx : remplacer par toast
- Sidebar.tsx : remplacer par toast

### Etape 6 : Masquer les donnees financieres des conducteurs selon le role
- Conditionner l'affichage des couts salariaux dans la section conducteurs du Calculator

### Etape 7 : Masquer le tableau de comparaison selon le role
- Appliquer les conditions `canViewCostBreakdown` / `canViewFinancialData`

### Section technique

Les modifications impactent les fichiers suivants :
- `src/hooks/useCalculations.ts`
- `src/components/ai/LoadTourDialog.tsx`
- `src/pages/Calculator.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Charges.tsx`
- `src/components/layout/Sidebar.tsx`

Aucune modification de base de donnees ou de schema n'est requise. Toutes les corrections sont cote client (React/TypeScript).

