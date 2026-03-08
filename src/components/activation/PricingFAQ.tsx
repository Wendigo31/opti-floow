import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ_CATEGORIES = [
  {
    title: '🚀 Prise en main & Inscription',
    items: [
      {
        question: 'Comment créer mon compte OptiFlow ?',
        answer: 'Depuis la page d\'accueil, cliquez sur « Choisir ce forfait » sous l\'offre souhaitée. Vous serez redirigé vers notre paiement sécurisé Stripe, puis vers un formulaire d\'onboarding pour renseigner votre société (SIREN, nom, email). Votre identifiant société et vos accès sont créés automatiquement.',
      },
      {
        question: 'Quels navigateurs sont compatibles ?',
        answer: 'OptiFlow fonctionne sur tous les navigateurs modernes : Chrome, Firefox, Edge, Safari. L\'application est responsive et s\'utilise aussi sur tablette et smartphone. Une version desktop (Windows/Mac) est également disponible via notre installeur.',
      },
      {
        question: 'Puis-je installer l\'application sur mon ordinateur ?',
        answer: 'Oui, OptiFlow est disponible en tant qu\'application de bureau (PWA) et application native Tauri pour Windows et macOS. Vous pouvez l\'installer directement depuis votre navigateur ou télécharger l\'installeur depuis la page dédiée.',
      },
      {
        question: 'L\'application fonctionne-t-elle hors connexion ?',
        answer: 'Oui, en partie. Grâce à la technologie PWA, les données consultées récemment sont mises en cache. Les calculs de coûts basiques fonctionnent hors ligne. La synchronisation se fait automatiquement dès que la connexion revient.',
      },
    ],
  },
  {
    title: '💰 Forfaits & Tarification',
    items: [
      {
        question: 'Quels sont les 3 forfaits disponibles ?',
        answer: 'Start (49,99€/mois) : idéal pour les indépendants — calculateur de coûts, 5 véhicules, 1 utilisateur. Pro (132,99€/mois) : pour les exploitants — planning conducteurs, analyses IA limitées, export PDF/Excel, alertes de marge, jusqu\'à 3 utilisateurs. Enterprise (249€/mois) : solution complète — IA illimitée, gestion d\'équipe avec rôles, multi-agences, devis intelligents, utilisateurs illimités.',
      },
      {
        question: 'Puis-je changer de forfait à tout moment ?',
        answer: 'Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence de prix est calculée au prorata de votre période de facturation en cours. Le passage à un forfait inférieur prend effet à la prochaine date de renouvellement.',
      },
      {
        question: 'Comment fonctionne la facturation annuelle ?',
        answer: 'Le paiement annuel vous fait économiser jusqu\'à 27% (Start : 45,75€/mois, Pro : 116,58€/mois, Enterprise : 183,25€/mois). La facturation est automatique par carte bancaire via Stripe. Votre facture est disponible après chaque paiement.',
      },
      {
        question: 'Existe-t-il une période d\'essai ?',
        answer: 'Nous proposons un essai sans engagement. Contactez-nous à support@opti-group.fr pour obtenir un accès découverte et tester l\'application avec vos propres données.',
      },
      {
        question: 'Les modules complémentaires (add-ons) sont-ils résiliables ?',
        answer: 'Oui, les add-ons (Itinéraire PL, Tournées sauvegardées, Historique trajets, Tarification auto) sont activables et désactivables à tout moment. La facturation est ajustée automatiquement au prochain cycle.',
      },
      {
        question: 'Quels modes de paiement acceptez-vous ?',
        answer: 'Carte bancaire (Visa, Mastercard, CB) via notre plateforme sécurisée Stripe. Toutes les transactions sont conformes PCI-DSS. Pour les grands comptes, nous proposons aussi le virement bancaire sur demande.',
      },
    ],
  },
  {
    title: '🧮 Calculateur de coûts',
    items: [
      {
        question: 'Comment fonctionne le calculateur de rentabilité ?',
        answer: 'Le calculateur prend en compte tous les postes de coûts d\'un transport : carburant (prix au litre × consommation), péages (calcul automatique par itinéraire), coût conducteur (salaire horaire ou forfaitaire), AdBlue, frais de structure, amortissement véhicule. Il calcule automatiquement le coût total, le prix de revient au km, la marge et le profit.',
      },
      {
        question: 'Quels types de véhicules sont supportés ?',
        answer: 'Tous les poids lourds : porteurs, semi-remorques, ensembles articulés. Vous pouvez configurer chaque véhicule avec ses caractéristiques propres : consommation, PTAC, dimensions, coût d\'amortissement, assurance. Les remorques sont gérées séparément avec leurs propres coûts.',
      },
      {
        question: 'Comment sont calculés les péages ?',
        answer: 'Les péages sont calculés automatiquement via l\'API TomTom en tenant compte du type de véhicule (classe de péage), du nombre d\'essieux, du poids et de l\'itinéraire. Deux modes : autoroute et route nationale, pour comparer les coûts.',
      },
      {
        question: 'Puis-je sauvegarder mes calculs ?',
        answer: 'Oui, avec les forfaits Pro et Enterprise (ou l\'add-on Tournées). Vous pouvez sauvegarder vos tournées avec tous les paramètres, les retrouver, les modifier et les réutiliser. Les tournées sont synchronisées entre tous vos appareils.',
      },
      {
        question: 'Que se passe-t-il si j\'atteins mes limites de calculs ?',
        answer: 'Vous recevrez une notification. Vous pourrez alors passer au forfait supérieur pour débloquer plus de calculs quotidiens (Start : 5/jour, Pro : 25/jour, Enterprise : illimité). Vos données existantes ne sont jamais supprimées.',
      },
    ],
  },
  {
    title: '🗺️ Itinéraire & Navigation PL',
    items: [
      {
        question: 'L\'itinéraire tient-il compte des restrictions poids lourds ?',
        answer: 'Oui. Le module itinéraire utilise TomTom Truck Routing qui intègre les restrictions de hauteur, largeur, poids, ponts bas et zones interdites aux PL. Vous pouvez activer/désactiver ces filtres selon vos besoins.',
      },
      {
        question: 'Puis-je ajouter des étapes intermédiaires ?',
        answer: 'Oui, vous pouvez ajouter autant d\'étapes que nécessaire (chargements, déchargements, pauses). Chaque étape est prise en compte dans le calcul total de distance, durée et coût.',
      },
      {
        question: 'Comment fonctionne la recherche d\'adresses ?',
        answer: 'La recherche utilise l\'autocomplétion Google Places et TomTom. Vous pouvez aussi sauvegarder vos adresses favorites (dépôts, sites clients) pour les réutiliser rapidement. L\'historique de recherche est conservé.',
      },
      {
        question: 'Puis-je comparer autoroute vs route nationale ?',
        answer: 'Oui. Pour chaque calcul, deux itinéraires sont proposés : autoroute (plus rapide, péages inclus) et route nationale (sans péages, plus long). Vous voyez instantanément la différence de coût et de temps.',
      },
    ],
  },
  {
    title: '📅 Planning & Conducteurs',
    items: [
      {
        question: 'Comment fonctionne le planning des conducteurs ?',
        answer: 'Le planning est un tableau hebdomadaire/mensuel avec les conducteurs en lignes et les jours en colonnes. Vous pouvez affecter des tournées, des missions, des repos. Les entrées peuvent être récurrentes (ex: même ligne tous les lundis). L\'import Excel est supporté.',
      },
      {
        question: 'Puis-je importer mes conducteurs depuis un fichier Excel ?',
        answer: 'Oui, l\'import Excel est disponible pour les conducteurs, les clients et le planning. Un modèle de fichier est fourni. L\'import détecte automatiquement les doublons et propose de les fusionner.',
      },
      {
        question: 'Les conducteurs relais sont-ils gérés ?',
        answer: 'Oui, chaque entrée de planning peut inclure un conducteur relais avec un lieu et un horaire de relais. C\'est idéal pour les lignes longue distance avec changement de conducteur.',
      },
      {
        question: 'Comment gérer les ordres de mission ?',
        answer: 'Chaque entrée de planning peut contenir un ordre de mission avec références de ligne, adresses départ/arrivée, horaires, et notes. Les ordres peuvent être générés automatiquement par l\'IA (forfait Enterprise).',
      },
    ],
  },
  {
    title: '👥 Gestion clients',
    items: [
      {
        question: 'Comment gérer ma base de clients ?',
        answer: 'Le module Clients permet de créer, modifier et supprimer des fiches clients avec coordonnées, SIRET, adresses multiples et contacts. Chaque client peut avoir plusieurs sites de chargement/déchargement.',
      },
      {
        question: 'Qu\'est-ce que l\'analyse « Clients toxiques » ?',
        answer: 'Disponible en Enterprise, cette fonctionnalité analyse vos clients par rentabilité : fréquence des trajets, marge moyenne, coût moyen par km. Elle identifie les clients les moins rentables pour vous aider à renégocier vos tarifs.',
      },
      {
        question: 'Puis-je associer un client à un calcul ou une tournée ?',
        answer: 'Oui. Lors d\'un calcul ou d\'une tournée, vous pouvez sélectionner un client. Cela permet ensuite de suivre la rentabilité par client dans les rapports et le tableau de bord.',
      },
    ],
  },
  {
    title: '📊 Tableau de bord & Analyses',
    items: [
      {
        question: 'Que contient le tableau de bord ?',
        answer: 'Le tableau de bord affiche en temps réel : nombre de trajets, distance totale, chiffre d\'affaires, coûts totaux, marge moyenne, profit. Des graphiques interactifs montrent l\'évolution mensuelle et la répartition des coûts.',
      },
      {
        question: 'Comment fonctionne le prévisionnel ?',
        answer: 'Le module Prévisionnel (Pro/Enterprise) projette vos revenus et coûts sur les mois à venir en se basant sur votre historique de trajets et vos charges fixes. Il intègre la saisonnalité et les tendances.',
      },
      {
        question: 'Que font les analyses IA ?',
        answer: 'L\'IA analyse vos données pour suggérer des optimisations : itinéraires alternatifs, ajustements de tarifs, identification de lignes non rentables. En Enterprise, l\'IA peut aussi rédiger des ordres de mission et analyser des documents PDF.',
      },
    ],
  },
  {
    title: '💼 Charges & Frais',
    items: [
      {
        question: 'Quels types de charges puis-je enregistrer ?',
        answer: 'Trois types : journalières (péages, carburant), mensuelles (assurance, leasing, salaires) et annuelles (contrôle technique, formation). Chaque charge peut être HT ou TTC, catégorisée et associée à un véhicule.',
      },
      {
        question: 'Comment les charges sont-elles intégrées au calcul ?',
        answer: 'Les charges mensuelles et annuelles sont ramenées à un coût journalier, puis intégrées dans le « frais de structure » de chaque calcul. Cela donne un coût de revient complet et réaliste pour chaque trajet.',
      },
      {
        question: 'Puis-je créer des modèles de charges ?',
        answer: 'Oui, les presets de charges permettent de sauvegarder des configurations types (ex: « Porteur 19T complet », « Semi standard ») et de les appliquer en un clic à de nouveaux calculs.',
      },
    ],
  },
  {
    title: '👨‍💼 Équipe & Rôles',
    items: [
      {
        question: 'Comment fonctionne la gestion d\'équipe ?',
        answer: 'Disponible en Pro (3 utilisateurs) et Enterprise (illimité). Le responsable peut inviter des collaborateurs par email, leur attribuer un rôle (Direction ou Exploitation) et contrôler les fonctionnalités accessibles.',
      },
      {
        question: 'Quelle est la différence entre les rôles Direction et Exploitation ?',
        answer: 'Direction : accès complet à toutes les données financières, marges, profits, charges. Exploitation : accès limité aux opérations quotidiennes (planning, itinéraires) sans voir les données financières sensibles. Le paramétrage est personnalisable par l\'administrateur.',
      },
      {
        question: 'Les données sont-elles partagées entre les utilisateurs d\'une même société ?',
        answer: 'Oui, les données sont partagées au niveau de la licence (société). Les véhicules, conducteurs, clients, tournées et charges sont accessibles par tous les membres selon leurs droits. Chaque modification est synchronisée en temps réel.',
      },
    ],
  },
  {
    title: '📤 Exports & Documents',
    items: [
      {
        question: 'Quels formats d\'export sont disponibles ?',
        answer: 'PDF (basique en Start, professionnel en Pro/Enterprise avec logo et mise en page personnalisée) et Excel (Pro/Enterprise). Les exports couvrent les calculs, tournées, planning, historique de trajets et rapports.',
      },
      {
        question: 'Puis-je personnaliser mes PDF avec le logo de ma société ?',
        answer: 'Oui, dans les Paramètres, vous pouvez configurer : logo, nom de société, adresse, SIRET, téléphone, email. Ces informations apparaissent sur tous vos exports PDF et devis.',
      },
      {
        question: 'Les devis sont-ils disponibles ?',
        answer: 'Oui, en Enterprise. Les devis sont générés automatiquement avec numérotation, conditions de vente personnalisables, TVA, et peuvent être envoyés directement au client. Le module Smart Quotes ajuste le prix selon la marge cible.',
      },
    ],
  },
  {
    title: '🔒 Sécurité & Données',
    items: [
      {
        question: 'Mes données sont-elles sécurisées ?',
        answer: 'Absolument. Vos données sont hébergées en Europe, chiffrées en transit (TLS) et au repos. Chaque société dispose de son espace isolé avec des politiques de sécurité strictes (Row Level Security). Les accès sont contrôlés par licence.',
      },
      {
        question: 'Puis-je exporter toutes mes données ?',
        answer: 'Oui, conformément au RGPD, vous pouvez exporter l\'intégralité de vos données à tout moment. En cas de résiliation, vos données restent accessibles pendant 30 jours.',
      },
      {
        question: 'Qu\'en est-il de la conformité RGPD ?',
        answer: 'OptiFlow est conforme au RGPD. Les données personnelles sont traitées uniquement dans le cadre du service. Aucune donnée n\'est revendue. La politique de confidentialité détaille les traitements, durées de conservation et vos droits (accès, rectification, suppression, portabilité).',
      },
      {
        question: 'Combien de temps mes données de facturation sont-elles conservées ?',
        answer: 'Les données de facturation sont conservées 10 ans conformément à la législation française. Les données d\'utilisation (trajets, calculs) sont conservées tant que votre compte est actif.',
      },
    ],
  },
  {
    title: '📞 Support & Contact',
    items: [
      {
        question: 'Comment contacter le support ?',
        answer: 'Par email à support@opti-group.fr. Les clients Enterprise bénéficient d\'un support prioritaire avec un temps de réponse garanti sous 24h ouvrées. Un formulaire de contact est aussi disponible directement dans l\'application.',
      },
      {
        question: 'Des formations sont-elles proposées ?',
        answer: 'Oui, un tutoriel interactif est intégré à l\'application lors de la première connexion. Des guides utilisateurs sont disponibles. Pour les clients Enterprise, nous proposons des sessions de formation personnalisées à distance.',
      },
      {
        question: 'Qui développe OptiFlow ?',
        answer: 'OptiFlow est développé par OptiGroup (en cours d\'immatriculation), une société spécialisée dans les solutions digitales pour le transport routier. Le logiciel est conçu par et pour des professionnels du transport.',
      },
    ],
  },
];

export default function PricingFAQ() {
  return (
    <section className="w-full max-w-4xl">
      <div className="text-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Foire aux questions</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Tout ce que vous devez savoir sur OptiFlow, ses fonctionnalités, sa tarification et sa sécurité.
        </p>
      </div>

      <div className="space-y-4">
        {FAQ_CATEGORIES.map((category, catIdx) => (
          <div key={catIdx} className="glass-card p-6">
            <h3 className="text-base font-semibold text-foreground mb-3">{category.title}</h3>
            <Accordion type="single" collapsible className="w-full">
              {category.items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${catIdx}-${i}`}
                  className={i === category.items.length - 1 ? 'border-none' : ''}
                >
                  <AccordionTrigger className="text-sm text-left font-medium hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}
