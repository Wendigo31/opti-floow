# OptiFlow

OptiFlow est une application professionnelle de pilotage de rentabilité pour les entreprises de transport routier. Elle transforme des données opérationnelles brutes en indicateurs financiers stratégiques.

Voici la description technique et fonctionnelle de l'architecture :

## 1. Concept et Architecture Logicielle

L'application adopte une architecture Hybrid Desktop-Web :

- **Frontend** : SPA (Single Page Application) développée en React 18 + TypeScript, compilée avec Vite, stylisée avec Tailwind CSS et les composants shadcn/ui (Radix).
- **Backend** : Supabase (PostgreSQL, Auth, Realtime et Edge Functions) pour la persistance cloud, la gestion des licences, l'authentification et les intégrations tierces (routing, géocodage, IA).
- **Desktop** : Packaging natif via Tauri (Rust) pour Windows, macOS et Linux — voir `src-tauri/`.
- **Persistance** : Les données sont synchronisées avec Supabase et mises en cache localement via `localStorage`, ce qui permet un fonctionnement partiellement hors-ligne et conserve les configurations (conducteurs, charges fixes) entre les sessions.

## 2. Algorithmes et Logique de Calcul (Le "Cœur" financier)

L'intelligence d'OptiFlow repose sur une décomposition rigoureuse du Coût de Revient en trois strates :

### A. Coûts Variables (Liés au trajet)
- Carburant : (Distance / 100) * Consommation * Prix HT.
- AdBlue : (Distance / 100) * Conso_AdBlue * Prix_AdBlue.
- Péages : Coût fixe saisi ou récupéré via API.

### B. Coûts Conducteurs (Social)
L'algorithme normalise le salaire mensuel en coût journalier :
- Coût Employeur : Salaire de base * (1 + % Charges Patronales).
- Taux Journalier : Coût mensuel / Jours travaillés par mois.
- Frais de déplacement : Somme réelle des repas et découchers spécifiques au trajet (Nb_Repas * Prix_Unitaire + Nb_Sommeil * Prix_Unitaire).
- Calcul Total : (Taux Journalier * Durée du voyage) + Frais de déplacement.

### C. Charges de Structure (Fixes)
L'algorithme de "lissage" répartit les frais généraux sur le voyage :
- Chaque charge (assurance, loyer, administratif) est convertie en Coût par Jour selon sa périodicité (Année/220j, Mois/21j, Jour/1j).
- Le coût de structure du trajet = Σ(Coûts journaliers) * Durée du voyage.

### D. Indicateurs de Performance (KPIs)
- Marge Nette : Chiffre d'Affaires - Coût de Revient Total.
- Seuil de Rentabilité (Break-even) : Calcule la distance minimale à parcourir pour couvrir les frais fixes et variables selon le prix au kilomètre.

## 3. Intégrations API

- **TomTom Routing API** : calcul précis des distances, temps de trajet et estimations de péages poids-lourds (mode camion).
- **HERE Maps** : géocodage et recherche d'adresses (fallback/complément à TomTom).
- **Leaflet & OpenStreetMap** : visualisation cartographique interactive du trajet.
- **Lucide Icons** : bibliothèque vectorielle pour l'interface.
- **Recharts** : rendu SVG pour les graphiques de répartition des coûts (Camembert) et d'analyse de marge (Barres).

## 4. Blocs Fonctionnels de l'Interface (UX/UI)

L'interface est divisée en modules accessibles via une Sidebar persistante :

- **Dashboard** : Scorecards (Marge Nette, Coût de Revient au km, CA Total, Seuil de Rentabilité), graphique Pie (répartition Gazole / Conducteur / Structure), graphique Barres (Coût vs CA).
- **Calculateur & Itinéraire** : saisie des paramètres véhicule/énergie, simulation de trajet (distance, péages, durée), sélection du conducteur actif.
- **Conducteurs** : base de données des chauffeurs avec taux horaires, paniers repas/découchers, absences.
- **Charges de Structure** : gestionnaire de frais fixes avec périodicité intelligente (Annuel/Mensuel/Quotidien).
- **Planning, Clients, Véhicules, Tournées, Prévisionnel, Équipe, Admin** : modules opérationnels complémentaires (voir `src/pages/`).
- **Paramètres** : configuration globale (jours travaillés/an/mois), clé API TomTom, carte de prévisualisation.

## 5. Design et Esthétique

- **Dark Mode natif** : palette Slate-900 pour réduire la fatigue visuelle des exploitants transport.
- **Responsive Design** : grille adaptative passant de 2 colonnes sur desktop à 1 colonne sur tablette/mobile.
- **Print-Engine** : CSS média `@media print` optimisé — le bouton "Rapport PDF" masque les menus et génère un rapport propre, prêt à être envoyé au client ou à la comptabilité.
- **Micro-interactions** : transitions fluides et feedback visuel immédiat sur les calculs (temps réel via React).

En résumé : OptiFlow n'est pas qu'un simple calculateur, c'est un outil d'aide à la décision permettant de savoir instantanément si un transport est rentable avant même que le camion ne démarre.

---

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://opti-floow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c933735-3855-419d-aa3f-0117115c42c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Desktop (Tauri)

```sh
npm run dev -- --mode tauri     # via beforeDevCommand configured in src-tauri/tauri.conf.json
```

Requires the Rust toolchain and Tauri CLI — see `src-tauri/README.md`.
