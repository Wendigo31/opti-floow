/**
 * Versions d'OptiFlow (format Vx.y.z) : x = refonte, y = nouvelles fonctions, z = corrections.
 * Reconstitué à partir de tout l'historique des modifications (janvier 2026 → aujourd'hui).
 * La première entrée est la version en cours.
 */
export interface Release {
  version: string;
  date: string; // AAAA-MM-JJ
  title: string;
  changes: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '2.5.1',
    date: '2026-11-14',
    title: 'Nouvelle adresse de contact',
    changes: [
      "L'adresse pour nous écrire devient contact@opti-group.fr (à la place de support@opti-group.fr), partout dans le logiciel",
    ],
  },
  {
    version: '2.5.0',
    date: '2026-11-10',
    title: 'Dossier de la société',
    changes: [
      "Fichiers rangés dans le dossier de la société, à son adresse (<identifiant>.opti-flow.app) : « documents » pour ce qu'OptiGroup vous envoie (factures, Kbis, licence), « software » pour les données du logiciel",
      "Dossier « software / fichiers » prêt pour les fichiers du logiciel",
      "Copie de vos données mise à jour chaque nuit dans le dossier « software » (un fichier par tableau, lisible dans Excel)",
    ],
  },
  {
    version: '2.4.1',
    date: '2026-11-08',
    title: 'Corrections',
    changes: [
      "Les trajets, rapports clients, favoris, devis et réglages gardés sur l'appareil ne sont plus effacés après une mise à jour, ni perdus au changement de société",
      "Exploitation : les charges fixes sont de nouveau prises en compte dans le calculateur, les tournées, le montage de lignes et les devis",
      "Le badge du forfait reste juste après un rechargement",
      "Équipe : le vrai motif d'un refus d'invitation s'affiche (déjà membre, limite du forfait, compte Direction)",
    ],
  },
  {
    version: '2.4.0',
    date: '2026-11-06',
    title: 'GPS poids lourd, planning et forfaits',
    changes: [
      "GPS poids lourd intégré : un clic depuis une ligne du planning, une tournée ou un itinéraire, guidage vocal vers le chargement puis la livraison, au gabarit du véhicule",
      "Planning : un clic sur un jour change le conducteur du jour ; un clic sur une ligne la modifie sans quitter le planning",
      "Planning : lier une tournée reprend son conducteur et son véhicule ; changer le conducteur d'une tournée met à jour le planning à venir",
      "Itinéraire : poids lourd uniquement (plus de mode voiture), avec les dimensions du véhicule choisi",
      "Marge visée choisie au moment du calcul (calculateur, devis, analyses) ; les Paramètres ne donnent que la valeur de départ",
      "Forfaits : le forfait réel de la société est appliqué, avec un message exact quand une option est réservée à un autre forfait ; Création de ligne incluse dès Pro",
      "Une option activée depuis OptiCentral s'applique, sans avoir à se reconnecter",
      "Les droits réglés par la Direction (pages, données financières, gestion des véhicules, conducteurs, clients et tournées) sont appliqués",
      "Le tutoriel ne s'affiche plus qu'au premier lancement (et à la demande dans Paramètres)",
      "Affichage corrigé dans les petites fenêtres : boutons et onglets ne sont plus coupés",
    ],
  },
  {
    version: '2.3.0',
    date: '2026-11-02',
    title: 'Paramètres refondus',
    changes: [
      'Paramètres identiques dans les 3 logiciels : Général, Mon App, Fichier et Légal',
      'Taux de TVA par défaut de la société (20 % de base)',
      "Historique des modifications de chaque membre de l'équipe, et notifications avec son nom",
      'Export de toutes les données de la société au format .opp',
      'Numéro de version et historique complet des versions',
      'Fonctionnalités de votre forfait, actives ou non',
      'Correctif : le changement du mot de passe provisoire ne bouclait plus sur la même page',
      'Correctif : la liste des conducteurs n’est plus rechargée en boucle',
      "Les messages d'OptiCentral ne masquent plus la barre du haut",
    ],
  },
  {
    version: '2.2.2',
    date: '2026-11-01',
    title: 'Tutoriel et connexion',
    changes: [
      'Tutoriel de premier lancement refait : un pas par espace accessible, avec les nouveautés',
      'Connexion depuis opti-group.fr avec la seule adresse e-mail',
      'Import Excel des charges fixes et des conducteurs, sous n’importe quelle forme, avec modèle',
      "L'abonnement OptiGroup est compté d'office dans les charges fixes",
    ],
  },
  {
    version: '2.2.1',
    date: '2026-11-01',
    title: 'Corrections après audit',
    changes: [
      'Application conducteur : une tournée terminée ne peut plus être rejouée',
      'Page Devis : plus de plantage quand les coûts sont masqués (Exploitation)',
      'Création de ligne masquée hors forfait IA, avec message explicite',
      'Mois facturé par défaut calculé en heure locale',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-11-01',
    title: 'Facturation et terrain',
    changes: [
      "Facture mensuelle par donneur d'ordre à partir des tournées réalisées, Factur-X, avoirs et export FEC",
      'Grilles tarifaires par client, proposées sur les devis et les factures',
      'Gestion des palettes échangées et solde par client',
      'Application conducteur : lien personnel vers ses tournées du jour, sans mot de passe',
      'Devis numérotés à la suite, montants lisibles dans les PDF',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-10-31',
    title: 'OptiCentral et compte société',
    changes: [
      "Pont d'administration OptiCentral : sociétés, forfaits, annonces, santé et RGPD",
      'Documents de la société : envoi du Kbis et de la licence de transport',
      'Mot de passe oublié : code provisoire envoyé par e-mail',
      'Connexion identique aux autres logiciels : e-mail / identifiant et mot de passe provisoire',
      'Équipe : la Direction et les RH créent les accès et règlent les rôles',
      'Support intégré, logo OptiGroup sur la connexion',
      'Abonnement par prélèvement mensuel (fin de Stripe) ; documents juridiques sur opti-group.fr',
      'Nouvelle identité visuelle, logo animé au chargement, thème jour / nuit',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-10-18',
    title: 'Refonte OptiGroup',
    changes: [
      'Accueil par espaces métier, barre latérale propre à chaque espace',
      "Espace Appels d'offres et analyse par IA",
      'Gestion de parc, historique et prévisionnel des charges',
      'Forfait unique simplifié',
      'Coût réel des tournées dans les PDF',
      'Lien de connexion par société',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-09-30',
    title: 'Coût réel',
    changes: ['Colonne coût réel des tournées, et dans les PDF', 'Corrections sur les conducteurs masqués'],
  },
  {
    version: '1.4.0',
    date: '2026-08-31',
    title: 'Sécurité et renommage',
    changes: [
      'Audit complet : renommage OptiFlow, corrections de bugs',
      'Audit de sécurité et tests automatiques',
      'Rôles verrouillés à la connexion, protection contre l’élévation de droits',
      'Clé de carte protégée côté serveur',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-04-30',
    title: 'Création de ligne et cartographie',
    changes: [
      'Montage de ligne assisté (retour croisé, filtres)',
      'Absences des conducteurs, recherche et filtres CDI / CDD',
      'Cartes et itinéraires HERE / TomTom, export PDF d’itinéraire',
      'PDF refondus, chargement plus rapide, sécurité renforcée',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-31',
    title: 'OptiFlow et forfaits',
    changes: [
      'Line Optimizer devient OptiFlow',
      'Forfaits, comparatif et options à la carte',
      'Acceptation des CGU / CGV à la première connexion',
      'Planning dimensionné pour de très gros volumes',
      'Présentation de démonstration',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-28',
    title: 'Planning et imports',
    changes: [
      'Planning des tournées (récurrent, jour / nuit, par contrat), import de la semaine depuis Excel',
      'Import Excel des conducteurs et des clients, modèles fournis',
      'Tournées multi-véhicules, coûts complets, ordres de mission',
      'Types de conducteurs : CDI, CDD, intérim, joker, autre',
      'Données partagées en temps réel dans toute l’équipe',
      'CGV, mentions légales et tutoriel de prise en main',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-31',
    title: 'Première version',
    changes: [
      'Calculateur de trajet et rentabilité',
      'Itinéraires poids lourd avec restrictions',
      'Clients, tournées, charges et comparaison des tournées',
      'Équipe : rôles, permissions fines et administration',
      'Synchronisation cloud des données de la société',
      'Application installable (mobile et ordinateur)',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
