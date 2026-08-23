# Optiflow

DrivProfit V3 est une application professionnelle de pilotage de rentabilité pour les entreprises de transport routier. Elle transforme des données opérationnelles brutes en indicateurs financiers stratégiques.
Voici la description technique et fonctionnelle exhaustive de l'architecture :
1. Concept et Architecture Logicielle
L'application adopte une architecture Hybrid Desktop-Web :
Frontend : SPA (Single Page Application) ultra-performante développée en React, stylisée avec Tailwind CSS. Elle utilise un mode "No-Build" via Babel Standalone pour une portabilité maximale.
Backend (Wrapper) : Un serveur HTTP léger en Python qui encapsule l'application dans une fenêtre native via PyWebview, permettant un accès aux ressources locales et une distribution facilitée.
Persistance : Les données sont sauvegardées localement via l'API localStorage, garantissant que les configurations (conducteurs, charges fixes) sont conservées entre les sessions sans base de données complexe.
2. Algorithmes et Logique de Calcul (Le "Cœur" financier)
L'intelligence de DrivProfit repose sur une décomposition rigoureuse du Coût de Revient en trois strates :
A. Coûts Variables (Liés au trajet)
Carburant : (Distance / 100) * Consommation * Prix HT.
AdBlue : (Distance / 100) * Conso_AdBlue * Prix_AdBlue.
Péages : Coût fixe saisi ou récupéré via API.
B. Coûts Conducteurs (Social)
L'algorithme normalise le salaire mensuel en coût journalier :
Coût Employeur : Salaire de base * (1 + % Charges Patronales).
Taux Journalier : Coût mensuel / Jours travaillés par mois.
Frais de déplacement : Somme réelle des repas et découchers spécifiques au trajet (Nb_Repas * Prix_Unitaire + Nb_Sommeil * Prix_Unitaire).
Calcul Total : (Taux Journalier * Durée du voyage) + Frais de déplacement.
C. Charges de Structure (Fixes)
L'algorithme de "lissage" répartit les frais généraux sur le voyage :
Chaque charge (assurance, loyer, administratif) est convertie en Coût par Jour selon sa périodicité (Année/220j, Mois/21j, Jour/1j).
Le coût de structure du trajet = Σ(Coûts journaliers) * Durée du voyage.
D. Indicateurs de Performance (KPIs)
Marge Nette : Chiffre d'Affaires - Coût de Revient Total.
Seuil de Rentabilité (Break-even) : Calcule la distance minimale à parcourir pour couvrir les frais fixes et variables selon le prix au kilomètre.
3. Intégrations API
TomTom Routing API : Utilisée pour le calcul précis des distances, des temps de trajet et des estimations de péages poids-lourds (mode camion).
Leaflet & OpenStreetMap : Pour la visualisation cartographique interactive du trajet.
Lucide Icons : Bibliothèque vectorielle pour une interface intuitive.
Recharts : Moteur de rendu SVG pour les graphiques de répartition des coûts (Camembert) et d'analyse de marge (Barres).
4. Blocs Fonctionnels de l'Interface (UX/UI)
L'interface est divisée en modules accessibles via une Sidebar persistante :
Dashboard (Tableau de Bord) :
Quatre "Scorecards" flash : Marge Nette (couleur dynamique vert/rouge), Coût de Revient au km, CA Total, Seuil de Rentabilité.
Graphique Pie : Visualise quel poste de dépense "mange" la marge (Gazole vs Conducteur vs Structure).
Graphique Barres : Comparaison directe entre Coût et CA pour visualiser la profitabilité.
Calculateur & Route :
Saisie des paramètres véhicules (Conso) et énergie.
Interface de simulation de trajet (Distance, Péages, Durée).
Sélecteur de conducteur actif pour appliquer son profil salarial spécifique.
Gestion des Conducteurs :
Base de données des chauffeurs avec leurs taux horaires et coûts de paniers repas/découchers.
Charges de Structure :
Gestionnaire de frais fixes avec système de périodicité intelligente (Annuel/Mensuel/Quotidien).
Paramètres :
Configuration globale (Nombre de jours travaillés par an/mois).
Intégration de la clé API TomTom.
Carte de prévisualisation Leaflet.
5. Design et Esthétique
Dark Mode Natif : Utilise la palette Slate-900 pour réduire la fatigue visuelle des exploitants transport.
Responsive Design : Grille adaptative (Flexbox/Grid) passant de 2 colonnes sur desktop à 1 colonne sur tablette.
Print-Engine : CSS média @media print optimisé. En un clic sur "Rapport PDF", l'interface masque les menus et génère un rapport blanc propre, prêt à être envoyé au client ou à la comptabilité.
Micro-interactions : Transitions fluides sur les changements de vue et feedback visuel immédiat sur les calculs (calcul en temps réel via les effets React).
En résumé : DrivProfit V3 n'est pas qu'un simple calculateur, c'est un outil d'aide à la décision permettant de savoir instantanément si un transport est rentable avant même que le camion ne démarre.

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
