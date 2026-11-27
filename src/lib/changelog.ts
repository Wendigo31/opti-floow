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
    version: "2.12.8",
    date: "2026-11-27",
    title: "Double authentification renforcée",
    changes: [
      "Double authentification : la base de données refuse désormais toute lecture ou écriture tant que le code à 6 chiffres n'a pas été saisi (pour les comptes qui l'ont activée)",
      "Double authentification : une session restée sans code (onglet fermé pendant la saisie) redemande le code à l'ouverture",
    ],
  },
  {
    version: "2.12.7",
    date: "2026-11-22",
    title: "Double authentification, chronotachygraphe, CNR et carburant",
    changes: [
      "Double authentification : code à 6 chiffres d'une application (Google Authenticator, Authy…) à la connexion, à activer dans Paramètres",
      "Chronotachygraphe : lecture des fichiers .ddd de la carte conducteur, temps de conduite et infractions au règlement CE 561/2006",
      "Analyse : trajets des 30 derniers jours comparés au coût de revient CNR (indices modifiables)",
      "Carburant : import des relevés de cartes carburant (AS24, DKV, Total, Shell, UTA…), consommation et coût réels par véhicule",
      "Fiches de paie : pré-paie depuis le fichier .ddd de la carte conducteur (temps de service, heures d'équivalence et sup., nuit, dimanche, repas, casse-croûte selon la convention collective, jours fériés, découchers estimés pour les grands routiers)",
      "Conducteurs : modèle de contrat (catégorie, coefficient, ancienneté) qui remplit heures, taux et salaire minimum",
      "Grilles tarifaires clients : modifiables par la Direction et la Comptabilité seulement",
      "RH › Relevés tachy : cartes conducteur importées et enregistrées, synthèse mensuelle pour la paie (export CSV), détail jour par jour et infractions (import par la Direction et les RH, consultation pour l'Exploitation et la Comptabilité) ; la pré-paie du bulletin reprend les relevés enregistrés",
      "Sociétés de démonstration : relevés de chronotachygraphe sur 6 mois, complétés chaque soir",
    ],
  },
  {
    version: "2.12.6",
    date: "2026-11-22",
    title: "Analyse prête dès l'ouverture",
    changes: [
      "Analyse : toutes les tournées sont sélectionnées à l'ouverture, plus d'alerte « Marge faible : 0 % » sur une page vide",
      "Fiches de paie : les intérimaires ne sont plus listés (payés par leur agence)",
      "Sociétés de démonstration : activité simulée chaque soir (journées, factures, paies) et pas de demande de Kbis",
    ],
  },
  {
    version: "2.12.5",
    date: "2026-11-22",
    title: "Fonction de connexion plus robuste",
    changes: [
      "Fonction serveur de connexion : une requête sans contenu reçoit un refus propre au lieu d'une erreur serveur",
    ],
  },
  {
    version: "2.12.4",
    date: "2026-11-21",
    title: "Coût de revient : structure répartie sur la flotte",
    changes: [
      "Charges de structure du jour réparties entre les véhicules actifs (avant : chaque tournée portait toutes les charges de la société)",
      "Prévisionnel recalculé en conséquence",
    ],
  },
  {
    version: "2.12.3",
    date: "2026-11-21",
    title: "Sécurité (analyse complète)",
    changes: [
      "Mot de passe oublié : le code provisoire ne remplace l'ancien mot de passe qu'au moment où il est utilisé (plus de blocage d'un compte par un tiers)",
      "Coordonnées société complétées uniquement par la Direction connectée",
      "Fonctions serveur : le lien de société ne suffit plus à ouvrir une session avec un email, ancien envoi de code de licence fermé, versions non publiées masquées, dépôt de documents limité aux types courants",
      "Plus de données affichées dans la console du navigateur",
    ],
  },
  {
    version: "2.12.2",
    date: "2026-11-21",
    title: "Sécurité",
    changes: [
      "Sécurité : réglages d'accès (forfait, onglets) et bandeaux OptiCentral d'une société réservés à ses membres",
      "Sécurité : fonctions de base réécrites sans requêtes assemblées à l'exécution",
      "Exports du dossier comptable (CSV) : un texte commençant par = + - @ n'est plus pris pour une formule par Excel",
      "Code conducteur FL- : plafond global d'essais en plus de la limite par adresse",
    ],
  },
  {
    version: "2.12.1",
    date: "2026-11-21",
    title: "Code conducteur pour l'appli OptiGroup Conducteur",
    changes: [
      "Chaque conducteur a un code FL-xxxxxx pour l'appli OptiGroup Conducteur (App Store / Google Play), commune à OptiFret, OptiFlow et OptiXpress",
      "Le code est affiché dans la fenêtre « Application » du conducteur et ajouté au SMS ; « Nouveau lien » change aussi le code",
      "Connexion par code limitée à 10 essais par quart d'heure",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-11-21",
    title: "Appli OptiFlow Conducteur",
    changes: [
      "Nouvelle appli OptiFlow Conducteur, installable sur le téléphone par le lien personnel du conducteur (sans mot de passe)",
      "Lignes du jour et de la semaine (horaires, adresses, ordre de mission, relais, absences), itinéraire Google Maps ou Waze",
      "Pointage : prise de service, coupures, fin de service, kilométrage ; heures de travail, de nuit (21 h – 6 h), repas et découchers",
      "Documents et preuves par ligne : CMR signée, bon de livraison, photos, réserves, ticket de pesée, bon de chantier, signature du destinataire",
      "Véhicule et frais : check-list de départ, pleins gazole et AdBlue, péages et frais avec photo du ticket, signalement de panne",
      "RH › Remontées conducteurs : heures (export tableur), pleins et frais, contrôles et pannes à traiter, documents",
      "Fiches de paie : les jours pointés dans l'appli aident à la saisie",
      "Matériel : porteurs toupie, fond mouvant, ampliroll, hydrocureur, 4x4 chantier ; semi toupie, fond mouvant bâché, bennes céréalière et ferrailleuse, citerne gaz, porte-bobines, caisson ampliroll",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-11-21",
    title: "Espace expert-comptable",
    changes: [
      "Comptabilité › Expert-comptable : dossier comptable du mois en un clic (factures et avoirs Factur-X, FEC, fiches de paie validées, pénalités, charges, récapitulatifs en tableur)",
      "Lien d'accès personnel pour votre cabinet : lecture seule, sans compte, valable 12 mois, révocable, avec la date de sa dernière visite",
    ],
  },
  {
    version: "2.10.0",
    date: "2026-11-21",
    title: "Pénalités",
    changes: [
      "Nouvel onglet Comptabilité › Pénalités : retenues des clients (retard, colis perdu ou abîmé…) avec suivi à vérifier / contestée / acceptée / remboursée",
      "Retards de paiement : factures payées en retard ou impayées, pénalités au taux de vos CGV (8,25 % par défaut, 3 fois le taux légal) + 40 € d'indemnité, décompte PDF à envoyer au client",
      "Amendes et PV : avis, véhicule, conducteur et compte à rebours des 45 jours pour désigner le conducteur",
    ],
  },
  {
    version: "2.9.1",
    date: "2026-11-21",
    title: "Grilles tarifaires mixtes",
    changes: [
      "Grille tarifaire d'un client : plusieurs bases peuvent s'additionner (ex. forfait à la journée + prix au point + km au-delà d'un seuil)",
      "Minimum de perception appliqué sur l'ensemble du transport",
    ],
  },
  {
    version: "2.9.0",
    date: "2026-11-20",
    title: "Paie, palettes et navigation",
    changes: [
      "Fiches de paie : même écran qu'OptiFret (bulletin par conducteur et par mois, brouillon → validé → PDF), dans RH et Comptabilité",
      "Itinéraire et Création de ligne réunis dans un seul onglet « Itinéraire & lignes »",
      "Palettes : stock de la société, « Dispatcher », filtres « Dûes » / « À rendre »",
      "Véhicules et remorques : tous types de tracteurs, porteurs et remorques, et types sur mesure",
      "Congés : mettre un conducteur en congés (ou toute autre absence) ne provoque plus d'erreur",
      "Bouton Accueil en haut de toutes les pages, Paramètres compris",
      "L'espace « Gestion de rentabilité » s'appelle maintenant « Pilotage »",
      "Kbis / licence : la fiche société se complète toute seule avec ce que lit l'IA",
      "Affichage : fenêtres qui défilent, onglets et textes qui ne débordent plus ; l'itinéraire ne recouvre plus l'en-tête",
      "« Mot de passe oublié » rétabli (nouvelle adresse d'OptiCentral)",
    ],
  },
  {
    version: "2.8.0",
    date: "2026-11-15",
    title: "Gazole, clients et calculateur",
    changes: [
      "Prix du gazole : prix HT officiel relevé en direct, plus votre ajustement en + ou en − (Factures › Indexation gazole), appliqué dès l'ouverture du calculateur",
      "Calculateur : départ et arrivée à saisir (facultatifs) en enregistrant la tournée, au lieu d'adresses fictives",
      "Le message de confirmation ne s'affiche plus deux fois en enregistrant une tournée",
      "Un client s'affiche partout de la même façon : sa société, puis le nom du contact",
      "Factures : le téléphone et l'email de la société sont repris avec les autres informations",
    ],
  },
  {
    version: "2.7.1",
    date: "2026-11-15",
    title: "Sécurité des cartes",
    changes: [
      "Cartes, itinéraires, péages et recherche d'adresses réservés aux utilisateurs connectés",
    ],
  },
  {
    version: "2.7.0",
    date: "2026-11-15",
    title: "Forfaits Essentiel, Pro et Entreprise",
    changes: [
      "Paramètres › Votre forfait : votre forfait, les trois forfaits côte à côte et les options à ajouter, avec leur prix",
      "Page d'activation et présentation : les trois forfaits remplacent l'ancien forfait unique",
      "Fonctions d'IA protégées : il faut être connecté et les avoir dans son forfait",
      "L'espace Appels d'offres n'apparaît plus quand son onglet n'est pas dans votre forfait",
      "Tutoriel adapté à votre forfait : il ne présente que ce qui est ouvert pour vous et dit ce qu'apporte le forfait suivant",
      "Les boutons « Voir les forfaits » mènent à vos Paramètres (la page n'existait pas)",
    ],
  },
  {
    version: '2.6.1',
    date: '2026-11-14',
    title: "Corrections après l'audit",
    changes: [
      "Calculateur : la tournée enregistrée garde le véhicule et les conducteurs choisis (devis et rentabilité justes)",
      "Calculateur : les primes et indemnités des conducteurs apparaissent dans le récapitulatif ; péages indiqués HT ou TTC",
      "Devis : une ancienne tournée enregistrée sans conducteur garde son coût calculé au lieu d'un coût trop bas",
      "Factures : une facture ne peut plus être émise sans SIREN ni adresse de la société",
      "Analyse : la prédiction et l'analyse par IA suivent le forfait",
      "Assistance : l'ouverture d'une session par OptiGroup ne reconnecte plus l'ancien compte du navigateur",
    ],
  },
  {
    version: '2.6.0',
    date: '2026-11-14',
    title: 'Mot de passe oublié',
    changes: [
      "Mot de passe oublié : la demande part directement chez OptiGroup, qui vous envoie aussitôt un email avec un mot de passe provisoire",
      "À la connexion avec ce mot de passe provisoire, le logiciel vous demande d'en choisir un nouveau",
    ],
  },
  {
    version: '2.5.2',
    date: '2026-11-14',
    title: 'Mise à jour de sécurité',
    changes: [
      "Import et export Excel : bibliothèque remplacée par la version à jour de son éditeur (failles connues corrigées)",
      "Vérification des formulaires : bibliothèque mise à jour (faille connue corrigée)",
    ],
  },
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
