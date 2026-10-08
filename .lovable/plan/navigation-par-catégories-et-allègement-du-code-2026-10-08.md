# Navigation par catégories et allègement du code

## Objectif
Remplacer l’accueil post-connexion actuel par un lanceur à **5 icônes**, qui réorganise uniquement les pages déjà présentes. Les routes, droits, données et comportements métier restent inchangés.

## Classement proposé des pages existantes

### 1. Exploitation
- **Planning** (`/planning`)
- **Tournées** (`/tours`)
- **Création de ligne** (`/line-montage`)
- **Clients** (`/clients`)
- **Véhicules et remorques** (`/vehicles`)

### 2. Géoloc
- **Itinéraire** (`/itinerary`)
- **Analyse par IA** (`/ai-analysis`) — analyse et optimisation d’itinéraires existante, sans ajout de capacité

### 3. Comptabilité — point ouvert
- **Charges fixes** (`/charges`) est la seule page existante qui s’en rapproche, mais elle alimente le calcul de rentabilité : ce n’est pas un module comptable.
- Proposition : placer **Charges fixes** sous cette icône, avec son libellé actuel, sans laisser entendre qu’OptiFlow gère factures, journaux ou écritures comptables.
- Si le client refuse ce rattachement, l’icône **Comptabilité** sera visible mais indiquée comme indisponible, sans page ni fonctionnalité inventée.

### 4. RH
- **Conducteurs et absences** (`/drivers`)
- **Équipe et droits** (`/team`)

### 5. Gestion de rentabilité
- **Calculateur et historique** (`/calculator`, `/history`)
- **Analyse & graphiques** (`/dashboard`)
- **Prévisionnel** (`/forecast`)
- **Rapports véhicules** (`/vehicle-reports`)

### Pages transversales, hors catégories
- **Paramètres** (`/settings`) reste accessible depuis la barre supérieure et le menu secondaire.
- **Mes restrictions** (`/my-restrictions`) reste accessible depuis son indicateur actuel.
- **Installation** (`/install`) reste un accès technique depuis les paramètres, sans icône métier.
- **Export tarifaire interne** (`/pricing-export`) et **Administration** (`/admin`) ne seront pas exposés dans le lanceur utilisateur.
- La page d’accueil (`/`) devient le lanceur ; elle n’est donc pas classée comme fonctionnalité.

## Structure de navigation

```text
Connexion validée
└── Accueil / lanceur
    ├── Exploitation
    ├── Géoloc
    ├── Comptabilité
    ├── RH
    └── Gestion de rentabilité
         └── Pages existantes autorisées pour l’utilisateur
```

- Chaque icône ouvre sur le même écran la liste courte des pages de sa catégorie ; un clic sur une page conserve sa route actuelle.
- Le menu latéral reprend les 5 mêmes groupes, repliables, avec le groupe de la page active ouvert.
- Le menu mobile reprend exactement la même configuration, au lieu de maintenir une seconde liste différente.
- Les règles actuelles sont conservées : fonctionnalités désactivées masquées, **Charges** et **Prévisionnel** réservés à Direction, restrictions individuelles respectées.
- Une seule configuration de navigation alimentera l’accueil, le menu latéral et le menu mobile. Elle supprimera notamment le lien mobile obsolète vers `/pricing` et rendra accessibles les pages existantes actuellement absentes des menus (`/ai-analysis`, `/vehicle-reports`).
- Aucun nouveau module, aucune nouvelle table et aucun calcul métier ne sont prévus.

## Fichiers de navigation concernés
- `src/pages/Home.tsx` : remplacer les widgets actuels par le lanceur des 5 catégories.
- `src/components/layout/Sidebar.tsx` : afficher les catégories partagées et leurs pages.
- `src/components/layout/MobileNav.tsx` : utiliser les mêmes catégories et règles que le menu ordinateur.
- `src/config/appNavigation.ts` (nouveau) : source unique des catégories, icônes, routes et restrictions.
- `src/components/navigation/CategoryLauncher.tsx` et `CategoryPageList.tsx` (nouveaux) : affichage du lanceur et des pages d’une catégorie.
- `src/App.tsx` : routes inchangées ; uniquement adaptation minimale si le retour à l’accueil doit réinitialiser la catégorie ouverte.

## Découpage des fichiers anormalement volumineux
Le découpage sera progressif et strictement sans changement fonctionnel. L’état et les appels existants resteront d’abord dans la page parente ; les blocs visuels seront extraits avec des propriétés explicites.

1. **`src/pages/Vehicles.tsx` — 2 535 lignes**
   - Extraire les onglets formulaire : informations, consommation, entretien, pneus.
   - Extraire les listes Véhicules et Remorques avec leurs actions groupées/import-export.
   - Conserver les hooks cloud et l’orchestration dans la page au premier passage.

2. **`src/pages/Drivers.tsx` — 1 735 lignes**
   - Raccorder et compléter les composants `DriverForm` et `DriverTable` déjà présents et testés, aujourd’hui non utilisés par la page réelle.
   - Remplacer les rendus répétés CDI/CDD/Intérim/Joker/Autre par une vue de catégorie commune.
   - Déplacer le type étendu et la liste protégée des champs de paie dans le domaine Conducteurs, sans modifier le masquage financier.

3. **`src/pages/AIAnalysis.tsx` — 1 516 lignes**
   - Extraire les types de réponse IA.
   - Séparer saisie, contraintes et vues de résultats par mode d’analyse.
   - Centraliser la lecture de l’itinéraire partagé au lieu de lire directement son stockage depuis la page.

4. **`src/pages/Itinerary.tsx` — 1 417 lignes**
   - Extraire la ligne d’étape déplaçable, le décodage de tracé et les blocs formulaire/carte/résultat.
   - Vérifier puis réutiliser les boîtes de sauvegarde existantes si elles couvrent bien le même flux ; sinon conserver les deux usages séparés.

5. **`src/pages/Calculator.tsx` — 1 412 lignes**
   - Extraire les sections Véhicule, Remorque, Trajet & tarification, Conducteurs et Récapitulatif.
   - Garder le moteur de coûts unique et l’état du calcul dans la page parente afin de ne modifier aucune formule.

6. **`src/pages/Admin.tsx` — 1 315 lignes**
   - Extraire la boîte de création/modification de licence et la table de licences.
   - Garder l’authentification admin et la coordination des onglets dans la page.

7. **`src/components/ai/LineMontageTab.tsx` — 1 121 lignes / 46 états locaux**
   - Séparer les modes formulaire structuré et texte libre.
   - Extraire les types et le calcul pur de coût conducteur, puis couvrir ce calcul par un test ciblé.

Les fichiers générés (`src/integrations/supabase/types.ts`) et les grands catalogues de types/configuration ne seront pas découpés artificiellement.

## Ordre d’exécution et validation
1. Créer la configuration centrale et ses tests de classement/droits.
2. Construire le lanceur post-connexion, puis brancher menus ordinateur et mobile sur la même source.
3. Vérifier chaque rôle sur ordinateur et mobile, les liens directs, le retour accueil et l’absence de lien mort.
4. Découper les gros fichiers **un par un** ; après chaque extraction, vérifier la page concernée avant de passer à la suivante.
5. Ajouter des tests ciblés aux composants réellement utilisés, notamment Conducteurs, et conserver les tests des règles financières et de confidentialité.
6. Validation finale : vérification TypeScript, suite de tests complète, construction de production et parcours connecté des cinq catégories.

## Décision attendue avant développement
Valider l’un des deux traitements pour **Comptabilité** :
- **Recommandé :** y rattacher uniquement **Charges fixes**, avec son nom actuel et sans promesse comptable ;
- ou afficher l’icône sans destination disponible, jusqu’à ce qu’une vraie page existante puisse y être rattachée.
