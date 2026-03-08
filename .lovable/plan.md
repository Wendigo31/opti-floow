

## Plan: Enrichir la page Activation avec descriptifs forfaits et FAQ

### Constat actuel
La page Activation a deux colonnes : formulaire de connexion (gauche) et un simple CTA "Choisir un forfait" (droite). Pas de descriptif des forfaits visible, pas de FAQ.

### Modifications sur `src/pages/Activation.tsx`

**1. Remplacer le CTA simple par 3 cartes forfaits**
- Passer le layout principal de `max-w-3xl grid-cols-2` a `max-w-5xl` avec connexion en haut et forfaits en dessous
- 3 cartes (Start, Pro, Enterprise) avec :
  - Icone, nom, prix mensuel/annuel, badge remise annuelle
  - Description courte du positionnement (Découverte / Croissance / Performance)
  - Liste des fonctionnalites cles avec icones check/x
  - Limites affichees clairement (nb vehicules, conducteurs, clients, calculs/jour)
  - Badge "Meilleur choix" sur Enterprise, highlight visuel
  - Toggle mensuel/annuel
  - Bouton "Choisir" qui ouvre `setShowOnboarding(true)`

**2. Ajouter une section FAQ sous les forfaits**
- Utiliser le composant `Accordion` deja present
- Questions couvrant :
  - "Puis-je changer de forfait ?" 
  - "Comment fonctionne la facturation ?"
  - "Que se passe-t-il si j'atteins mes limites ?"
  - "Existe-t-il une periode d'essai ?"
  - "Comment fonctionne le paiement ?"
  - "Puis-je ajouter des utilisateurs supplementaires ?"

**3. Layout final**
```text
┌─────────────────────────────────────┐
│            Logo + Titre             │
├──────────────┬──────────────────────┤
│  Connexion   │   CTA Forfaits      │
│  (formulaire)│   (bouton simple)   │
├──────────────┴──────────────────────┤
│     3 cartes forfaits cote a cote   │
│   [Start]    [Pro]    [Enterprise]  │
├─────────────────────────────────────┤
│          FAQ (Accordion)            │
└─────────────────────────────────────┘
```

Le formulaire de connexion et le CTA restent en haut en 2 colonnes. Les forfaits detailles et la FAQ s'ajoutent en dessous en pleine largeur.

