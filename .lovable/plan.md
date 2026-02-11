

# Planning : approche "recherche d'abord"

## Probleme
Le planning charge jusqu'a 10 000 lignes par semaine au chargement de la page, ce qui cause des problemes de persistance, de performance et de chargement infini.

## Solution
Ne plus charger automatiquement les donnees au chargement de la page. Afficher un ecran d'accueil invitant l'utilisateur a rechercher ou filtrer, puis ne charger que les resultats correspondants depuis la base de donnees (requete filtree cote serveur).

## Changements prevus

### 1. `src/pages/Planning.tsx`
- Supprimer le `useEffect` qui appelle `fetchEntries` automatiquement au changement de semaine
- Ajouter un etat `hasSearched` (false par defaut)
- Quand `hasSearched` est false, afficher un ecran d'accueil avec les champs de recherche et un message "Recherchez par client, ligne, conducteur, responsable secteur ou telephone pour afficher le planning"
- Quand l'utilisateur clique sur "Rechercher" ou appuie sur Entree, passer `hasSearched` a true et lancer `fetchEntries` avec les filtres actifs
- Les filtres (secteur, client, recherche texte) declenchent une requete serveur filtree au lieu d'un filtrage client

### 2. `src/hooks/usePlanning.ts`
- Modifier `fetchEntries` pour accepter des parametres de filtre optionnels : `tourName`, `clientId`, `sectorManager`, `driverName`
- Ajouter les clauses `.ilike()` ou `.eq()` correspondantes a la requete Supabase cote serveur
- Supprimer le `useEffect` d'auto-fetch au chargement (`licenseId + authUserId`)
- Reduire la limite de 10 000 a 1 000 (les resultats filtres seront toujours petits)

### 3. Filtrage cote serveur (nouvelle requete)
- `tour_name` : `.ilike('tour_name', '%query%')`
- `client_id` : `.eq('client_id', clientId)`
- `sector_manager` : `.ilike('sector_manager', '%query%')`
- `driver_id` : `.eq('driver_id', driverId)` ou recherche par nom dans `notes` via `.ilike('notes', '%query%')`
- Recherche universelle : combine plusieurs `.or()` pour chercher dans tour_name, notes, sector_manager, mission_order

### 4. UX de l'ecran d'accueil
- Barre de recherche principale (deja existante) mise en avant
- Filtres dropdowns (secteur, client, jour) toujours accessibles
- Bouton "Rechercher" explicite
- Message informatif : "Saisissez un critere de recherche pour afficher les lignes de planning"
- Les boutons "Ajouter une tournee" et "Importer Excel" restent toujours visibles
- Apres import, lancer automatiquement une recherche pour afficher les donnees importees

### 5. Comportement post-import
- Apres un import Excel, `hasSearched` passe a true et une recherche globale (sans filtre) est lancee sur la semaine courante, limitee a 500 resultats
- L'utilisateur peut ensuite affiner avec les filtres

---

## Details techniques

```text
Avant :
Page chargee --> fetchEntries(semaine) --> 10 000 lignes --> filtrage JS

Apres :
Page chargee --> ecran vide avec barre de recherche
Utilisateur tape "DUPONT" --> fetchEntries(semaine, {search: "DUPONT"}) --> ~20 lignes
```

Fichiers modifies :
- `src/hooks/usePlanning.ts` (parametres de filtre serveur, suppression auto-fetch)
- `src/pages/Planning.tsx` (etat hasSearched, ecran d'accueil, recherche declenchee)

