

## Correction de la fenetre "Conducteurs non reconnus" dans le Planning

### Probleme identifie
La fonctionnalite existe deja : quand un conducteur du planning n'est pas dans le repertoire, il apparait dans le bandeau "Conducteurs non reconnus" avec un bouton "Gerer". Cependant, la fenetre est trop petite (`max-w-lg`, scroll `400px`) et l'UX de creation est confuse (deux clics necessaires dans un espace reduit).

### Corrections prevues

**1. Agrandir la fenetre (UncreatedDriversBanner.tsx)**
- Passer le `DialogContent` en `w-[90vw] max-w-3xl h-[80vh]` pour que la liste soit confortable meme avec beaucoup de conducteurs
- Etendre le `ScrollArea` a `flex-1` pour occuper tout l'espace disponible

**2. Ameliorer le flow de creation**
- Afficher directement le selecteur de type (CDI/CDD/Interim) a cote du bouton "Creer" sans etape intermediaire
- Chaque ligne affiche : Nom | [CDI v] [Creer] [Fusionner] [Supprimer]
- Simplifier en un seul clic : choisir le type dans le dropdown puis cliquer "Creer"

**3. Ajouter un bouton "Creer tous"**
- Un bouton dans le footer pour creer tous les conducteurs restants d'un coup avec le type selectionne (CDI par defaut)
- Gain de temps quand il y a beaucoup de conducteurs a creer

### Fichier modifie
- `src/components/planning/UncreatedDriversBanner.tsx`
