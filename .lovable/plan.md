

# Plan : Onglet "Créer un montage" dans la page Analyse IA

## Objectif
Ajouter un nouvel onglet "Créer un montage" dans la page `/ai-analysis` qui permet de demander à l'IA de concevoir un montage de ligne (organisation complète d'un trajet récurrent) en prenant en compte :
- L'origine et la destination de la ligne
- Le nombre de conducteurs souhaités
- Découché ou non (choix utilisateur)
- Respect strict de la RSE
- Optimisation économique et compétitivité

L'IA retourne un plan de montage complet avec planning horaire, rotations conducteurs, coûts détaillés, et recommandations.

## Changements prévus

### 1. Restructurer la page AIAnalysis avec des onglets
- Ajouter un composant `Tabs` avec 2 onglets :
  - **"Optimisation trajet"** : contenu actuel de la page (inchangé)
  - **"Créer un montage"** : nouveau formulaire dédié

### 2. Nouveau composant `LineMontageTab` (`src/components/ai/LineMontageTab.tsx`)
Formulaire avec les champs suivants :
- **Origine** et **Destination** (avec `AddressInput` existant pour l'autocomplétion)
- **Arrêts intermédiaires** (optionnel, même logique que l'onglet existant)
- **Nombre de conducteurs souhaités** (sélecteur 1-6)
- **Découché autorisé** (switch oui/non)
- **Véhicule** (sélection depuis la flotte existante)
- **Fréquence** (aller simple, aller-retour quotidien, hebdomadaire)
- **Contraintes horaires** : heure de chargement, heure de livraison souhaitée
- **Budget cible** (optionnel)

Bouton "Générer le montage" qui appelle l'edge function.

### 3. Nouveau mode dans l'edge function `ai-optimize-trip`
- Ajouter un mode `line_montage` au `TripRequest`
- Prompt spécifique pour le montage de ligne qui demande à l'IA :
  - Organisation des rotations conducteurs sur la semaine
  - Respect strict RSE (temps de conduite, repos, amplitude)
  - Calcul des coûts avec/sans découché
  - Planning détaillé heure par heure
  - Comparaison de scénarios (avec/sans découché, nombre de conducteurs variable)

### 4. Affichage des résultats du montage
- Résumé du montage recommandé
- Planning visuel des rotations (réutilisation de `VisualSchedule`)
- Tableau comparatif des scénarios
- Détail des coûts par conducteur
- Notes réglementaires RSE
- Bouton "Sauvegarder en tournée"

### Fichiers modifiés
- `src/pages/AIAnalysis.tsx` — Ajout des onglets (Tabs) pour séparer optimisation et montage
- `src/components/ai/LineMontageTab.tsx` — Nouveau composant formulaire + résultats
- `supabase/functions/ai-optimize-trip/index.ts` — Ajout du mode `line_montage` avec prompt dédié

### Section technique
Le mode `line_montage` enverra un prompt enrichi demandant à l'IA de structurer sa réponse avec un champ `montage` contenant : `scenarios[]` (chacun avec `driverCount`, `overnightStays`, `weeklySchedule`, `costBreakdown`, `rseCompliance`), plus une `recommendation` globale. Le JSON de réponse sera compatible avec les interfaces existantes (`AIStrategy`, `AIResponse`) tout en ajoutant les champs spécifiques montage.

