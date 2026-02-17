import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Lock, Database, Building2, Scale, MapPin, Phone, Mail, UserCheck, Shield, AlertTriangle, Gavel } from 'lucide-react';

const COMPANY = {
  name: 'SAS OptiGroup',
  form: 'Société par Actions Simplifiée',
  address: '10B chemin de la claou',
  city: '31790 Saint-Jory, France',
  phone: '+33 6 46 69 14 62',
  email: 'support@opti-group.fr',
  director: 'M. Yanis Dini',
  directorTitle: 'Président',
  dpo: 'M. Yanis Dini',
  redaction: 'Mme Noémie Dini, Directrice Marketing',
};

const currentYear = new Date().getFullYear();

/* ─── MENTIONS LÉGALES ─── */
function MentionsLegales() {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScrollArea className="h-[600px] pr-4">
          {/* Éditeur + Direction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                  Éditeur du site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">{COMPANY.name}</p>
                    <p className="text-sm text-muted-foreground">{COMPANY.form}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-foreground">{COMPANY.address}</p>
                    <p className="text-foreground">{COMPANY.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="text-foreground">{COMPANY.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-foreground">{COMPANY.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Direction de la publication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground">Directeur de la publication</p>
                  <p className="text-muted-foreground">{COMPANY.director}, {COMPANY.directorTitle}</p>
                </div>
                <Separator />
                <div>
                  <p className="font-semibold text-foreground">Responsable de la rédaction</p>
                  <p className="text-muted-foreground">{COMPANY.redaction}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Propriété intellectuelle
              </h2>
              <p className="text-muted-foreground">
                L'ensemble du contenu des logiciels OptiFlow, OptiXpress et OptiFret 
                (ci-après « les Logiciels ») — incluant sans s'y limiter les textes, graphismes, 
                images, logos, icônes, sons, logiciels, bases de données, algorithmes, architecture 
                technique et code source — est la propriété exclusive de {COMPANY.name} et est protégé 
                par les lois françaises et internationales relatives à la propriété intellectuelle 
                (Code de la propriété intellectuelle, directive européenne 2009/24/CE relative à la 
                protection juridique des programmes d'ordinateur, Convention de Berne, accords ADPIC/TRIPS).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Hébergement</h2>
              <p className="text-muted-foreground">
                Les données sont hébergées par des prestataires conformes au RGPD, situés dans l'Union 
                européenne. Les serveurs applicatifs sont opérés via des infrastructures cloud sécurisées 
                avec chiffrement des données au repos et en transit (TLS 1.2+).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Droit applicable et juridiction</h2>
              <p className="text-muted-foreground">
                Les présentes mentions légales sont régies par le droit français. En cas de litige relatif 
                à l'interprétation ou l'exécution des présentes, et à défaut de résolution amiable dans un 
                délai de 30 jours, compétence exclusive est attribuée aux tribunaux compétents de Toulouse 
                (France), y compris en cas de référé, d'appel en garantie ou de pluralité de défendeurs.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Crédits</h2>
              <p className="text-muted-foreground">
                © {currentYear} {COMPANY.name} — Tous droits réservés. Toute reproduction totale ou partielle 
                du contenu est strictement interdite sans autorisation écrite préalable.
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── CGV / CGU ─── */
function CGV() {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScrollArea className="h-[600px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-0">Conditions Générales de Vente et d'Utilisation</h2>
                <p className="text-sm text-muted-foreground">Dernière mise à jour : février 2026</p>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-foreground font-medium">
                L'utilisation des Logiciels édités par {COMPANY.name} implique l'acceptation pleine et 
                entière des présentes CGVU. L'Éditeur se réserve le droit de modifier les présentes CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de souscription ou de renouvellement. Toute utilisation contraire aux présentes conditions expose 
                le contrevenant à des poursuites judiciaires.
              </p>
            </div>

            {/* Article 1 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 1 — Objet</h3>
            <p className="text-muted-foreground mb-4">
              Les présentes Conditions Générales de Vente et d'Utilisation (ci-après « CGVU ») régissent l'ensemble des conditions de commercialisation, de souscription et d'utilisation des licences logicielles et services proposés par {COMPANY.name} (ci-après « l'Éditeur »), incluant les solutions OptiFlow, OptiXpress et OptiFret (ci-après « les Logiciels » ou « la Solution »).
            </p>

            {/* Article 2 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 2 — Définitions</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-2 space-y-2">
              <li><strong>Client</strong> : toute personne physique ou morale ayant souscrit un abonnement aux Logiciels.</li>
              <li><strong>Utilisateur</strong> : toute personne physique autorisée par le Client à accéder à la Solution.</li>
              <li><strong>Licence</strong> : droit d'utilisation non exclusif, non transférable et non cessible concédé au Client.</li>
              <li><strong>SaaS (Software as a Service)</strong> : mode de distribution logicielle dans lequel la Solution est hébergée par l'Éditeur et accessible via Internet.</li>
              <li><strong>Données Client</strong> : ensemble des données saisies, importées ou générées par le Client dans le cadre de l'utilisation de la Solution.</li>
            </ul>

            {/* Article 3 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 3 — Prix et paiement</h3>
            <p className="text-muted-foreground mb-2">3.1. Les tarifs sont communiqués sur devis personnalisé ou selon la grille tarifaire en vigueur. Les prix s'entendent hors taxes (HT), la TVA applicable étant facturée en sus au taux en vigueur.</p>
            <p className="text-muted-foreground mb-2">3.2. Le paiement s'effectue selon les modalités précisées dans le devis accepté par le Client. Sauf disposition contraire, les factures sont payables à 30 jours date de facture.</p>
            <p className="text-muted-foreground mb-2">3.3. Tout retard de paiement entraîne de plein droit et sans mise en demeure préalable :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-1">
              <li>Des pénalités de retard calculées au taux d'intérêt légal majoré de 3 points par an ;</li>
              <li>Une indemnité forfaitaire pour frais de recouvrement de 40 euros (article D.441-5 du Code de commerce) ;</li>
              <li>La possibilité pour l'Éditeur de suspendre l'accès à la Solution jusqu'à complet paiement.</li>
            </ul>

            {/* Article 4 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 4 — Abonnement et durée</h3>
            <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Engagement contractuel</p>
                  <p className="text-sm text-muted-foreground">
                    Les licences logicielles sont proposées sous forme d'abonnement mensuel ou annuel. Chaque forfait souscrit implique un engagement minimal d'un (1) an à compter de la date de souscription.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mb-2">4.1. L'abonnement est conclu pour une période initiale incompressible de douze (12) mois (ci-après « la Période d'Engagement »).</p>
            <p className="text-muted-foreground mb-2">4.2. Le contrat se renouvelle tacitement pour des périodes successives d'un (1) an, sauf résiliation dans les conditions prévues à l'article 5.</p>
            <p className="text-muted-foreground mb-2">4.3. En cas de résiliation anticipée pendant la période d'engagement, le Client reste redevable de l'intégralité des sommes dues jusqu'à la fin de la période d'engagement en cours.</p>
            <p className="text-muted-foreground mb-4">4.4. Le changement de forfait vers un forfait supérieur est possible à tout moment. Le passage à un forfait inférieur ne prendra effet qu'à l'échéance de la Période d'Engagement en cours.</p>

            {/* Article 5 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 5 — Résiliation</h3>
            <p className="text-muted-foreground mb-2">5.1. Chaque partie peut résilier le contrat moyennant un préavis de trente (30) jours avant la date de renouvellement, par notification écrite envoyée à {COMPANY.email} ou par courrier recommandé avec accusé de réception.</p>
            <p className="text-muted-foreground mb-2">5.2. L'Éditeur peut résilier le contrat de plein droit, sans préavis ni indemnité, en cas de :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-2 ml-4 space-y-1">
              <li>Non-paiement des sommes dues dans un délai de 15 jours suivant une mise en demeure restée infructueuse ;</li>
              <li>Violation des conditions d'utilisation, notamment des dispositions relatives à la propriété intellectuelle (article 7) ;</li>
              <li>Utilisation frauduleuse ou illicite de la Solution ;</li>
              <li>Comportement portant atteinte à l'intégrité technique de la Solution.</li>
            </ul>
            <p className="text-muted-foreground mb-4">5.3. En cas de résiliation pour faute du Client, aucun remboursement ne sera effectué pour la période restante de l'abonnement en cours.</p>

            {/* Article 6 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 6 — Support et maintenance</h3>
            <p className="text-muted-foreground mb-2">6.1. {COMPANY.name} assure un support technique par email à {COMPANY.email} et par téléphone au {COMPANY.phone}, aux horaires ouvrés (du lundi au vendredi, 9h-18h, hors jours fériés français).</p>
            <p className="text-muted-foreground mb-2">6.2. Les mises à jour logicielles correctives et évolutives sont incluses dans l'abonnement.</p>
            <p className="text-muted-foreground mb-4">6.3. L'Éditeur s'engage à déployer ses meilleurs efforts pour assurer une disponibilité de la Solution de 99,5 % hors périodes de maintenance programmée. Les maintenances programmées font l'objet d'un préavis d'au moins 48 heures.</p>

            {/* Article 7 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 7 — Propriété intellectuelle et licence d'utilisation</h3>
            <p className="text-muted-foreground mb-4">
              Les Logiciels, leur code source, leur code objet, leur architecture, leur documentation, ainsi que tous les éléments qui les composent (textes, images, logos, bases de données, algorithmes, interfaces) sont et demeurent la propriété exclusive et intégrale d'{COMPANY.name}, protégés par le Code de la propriété intellectuelle français, le droit d'auteur (Directive 2009/24/CE relative à la protection juridique des programmes d'ordinateur) et les conventions internationales (Convention de Berne, accords ADPIC/TRIPS).
            </p>
            <p className="text-muted-foreground mb-4">
              La souscription à un abonnement confère au Client un droit d'utilisation non exclusif, non transférable, non cessible et non sous-licenciable, limité à la durée de l'abonnement et aux seules fins internes du Client.
            </p>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Il est strictement interdit au Client et à ses Utilisateurs de :</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>Copier, reproduire, dupliquer tout ou partie des Logiciels, sauf copie de sauvegarde unique conformément à l'article L.122-6-1 du Code de la propriété intellectuelle</li>
                <li>Décompiler, désassembler, procéder à de l'ingénierie inverse (reverse engineering) des Logiciels, sauf dans les cas strictement prévus par l'article L.122-6-1 du CPI</li>
                <li>Modifier, adapter, traduire, créer des œuvres dérivées à partir des Logiciels</li>
                <li>Distribuer, revendre, sous-licencier, louer, prêter ou mettre à disposition de tiers les Logiciels</li>
                <li>Extraire, réutiliser ou exploiter une partie substantielle du contenu des bases de données intégrées aux Logiciels (articles L.342-1 et suivants du CPI)</li>
                <li>Supprimer, masquer ou altérer toute mention de propriété intellectuelle, de copyright ou de marque figurant dans les Logiciels</li>
                <li>Utiliser les Logiciels pour développer un produit concurrent ou similaire</li>
                <li>Permettre l'accès aux Logiciels à des tiers non autorisés ou au-delà du nombre de licences souscrites</li>
              </ul>
            </div>

            {/* Article 8 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 8 — Conditions d'utilisation et comportement</h3>
            <p className="text-muted-foreground mb-2">Le Client s'engage à utiliser la Solution conformément à sa destination et dans le respect des lois et réglementations en vigueur. Il est notamment interdit de :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-1">
              <li>Utiliser la Solution à des fins illicites, frauduleuses ou contraires à l'ordre public</li>
              <li>Introduire volontairement des virus, malwares, ou tout programme nuisible</li>
              <li>Tenter de contourner les mesures de sécurité ou d'accéder à des parties non autorisées de l'infrastructure</li>
              <li>Surcharger intentionnellement les serveurs par des requêtes massives ou des attaques (DDoS, brute force, etc.)</li>
              <li>Utiliser des robots, scrapers ou tout procédé automatisé non autorisé</li>
              <li>Stocker ou traiter des données en violation du RGPD ou de toute réglementation applicable</li>
              <li>Partager ses identifiants de connexion avec des tiers non autorisés</li>
            </ul>
            <p className="text-muted-foreground mb-4">Le Client est responsable de la confidentialité de ses identifiants de connexion et de toute activité effectuée sous son compte.</p>

            {/* Article 9 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 9 — Sanctions et actions en justice</h3>
            <p className="text-muted-foreground mb-2">Toute violation des présentes CGVU, et en particulier des dispositions relatives à la propriété intellectuelle (article 7) et aux conditions d'utilisation (article 8), peut entraîner :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-1">
              <li>La suspension immédiate de l'accès à la Solution, sans préavis ni indemnité</li>
              <li>La résiliation de plein droit du contrat d'abonnement</li>
              <li>La facturation de dommages-intérêts en réparation du préjudice subi par l'Éditeur</li>
              <li>Des poursuites judiciaires, tant au civil qu'au pénal</li>
            </ul>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Sanctions pénales applicables (à titre informatif) :</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>La contrefaçon de logiciel est sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle</li>
                <li><strong>Personnes physiques</strong> : 3 ans d'emprisonnement et 300 000 € d'amende</li>
                <li><strong>Personnes morales</strong> : 1 500 000 € d'amende (article 131-38 du Code pénal)</li>
                <li><strong>Peines complémentaires</strong> : confiscation, fermeture d'établissement, interdiction d'exercer</li>
              </ul>
            </div>
            <p className="text-muted-foreground mb-4">L'Éditeur se réserve le droit de procéder à des audits d'utilisation afin de vérifier le respect des conditions de la licence. Le Client s'engage à coopérer de bonne foi dans le cadre de ces audits.</p>

            {/* Article 10 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 10 — Données du Client et réversibilité</h3>
            <p className="text-muted-foreground mb-2">10.1. Les données saisies par le Client dans la Solution restent sa propriété.</p>
            <p className="text-muted-foreground mb-2">10.2. L'Éditeur s'engage à ne pas accéder aux données du Client sauf à des fins de support technique, avec l'accord préalable du Client, ou en cas d'obligation légale.</p>
            <p className="text-muted-foreground mb-4">10.3. En cas de cessation du contrat, le Client dispose d'un délai de trente (30) jours à compter de la fin du contrat pour demander l'export de ses données dans un format standard et exploitable. Passé ce délai, l'Éditeur procédera à la suppression définitive des données du Client, conformément au RGPD.</p>

            {/* Article 11 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 11 — Confidentialité</h3>
            <p className="text-muted-foreground mb-2">11.1. Chaque partie s'engage à maintenir strictement confidentielle toute information confidentielle reçue de l'autre partie dans le cadre de l'exécution du contrat.</p>
            <p className="text-muted-foreground mb-4">11.2. Cette obligation perdure pendant une durée de cinq (5) ans après la fin du contrat.</p>

            {/* Article 12 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 12 — Limitation de responsabilité</h3>
            <p className="text-muted-foreground mb-2">12.1. {COMPANY.name} s'engage à fournir ses services avec diligence dans le cadre d'une obligation de moyens.</p>
            <p className="text-muted-foreground mb-2">12.2. En aucun cas, l'Éditeur ne pourra être tenu responsable des dommages indirects, pertes de profit, pertes de données, manque à gagner ou préjudice commercial.</p>
            <p className="text-muted-foreground mb-2">12.3. L'Éditeur ne pourra être tenu responsable des interruptions dues à un cas de force majeure (au sens de l'article 1218 du Code civil), des dysfonctionnements liés à l'environnement technique du Client (connexion Internet, matériel, logiciels tiers) ou de l'utilisation non conforme de la Solution.</p>
            <p className="text-muted-foreground mb-4">12.4. En tout état de cause, la responsabilité totale de l'Éditeur est limitée au montant des sommes effectivement versées par le Client au cours des douze (12) derniers mois précédant le fait générateur de responsabilité.</p>
            <p className="text-muted-foreground mb-4">12.5. Le Client est seul responsable de l'utilisation qu'il fait des Logiciels et des décisions prises sur la base des résultats fournis (calculs de coûts, optimisations, prévisions). Les données et calculs fournis par les Logiciels sont indicatifs et ne constituent pas un conseil professionnel.</p>

            {/* Article 13 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 13 — Force majeure</h3>
            <p className="text-muted-foreground mb-4">
              Aucune des parties ne sera responsable de l'inexécution de ses obligations en cas de force majeure telle que définie par l'article 1218 du Code civil, incluant notamment : catastrophes naturelles, guerres, pandémies, grèves, pannes de réseau, cyberattaques d'envergure, décisions gouvernementales ou réglementaires.
            </p>

            {/* Article 14 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 14 — Protection des données personnelles</h3>
            <p className="text-muted-foreground mb-2">14.1. L'Éditeur traite les données personnelles du Client conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée. Pour plus de détails, veuillez consulter notre Politique de Confidentialité.</p>
            <p className="text-muted-foreground mb-4">14.2. Lorsque l'Éditeur agit en qualité de sous-traitant au sens du RGPD (traitement des données Client), un accord de traitement des données (DPA) peut être conclu sur demande.</p>

            {/* Article 15 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 15 — Garanties</h3>
            <p className="text-muted-foreground mb-2">15.1. L'Éditeur garantit que les Logiciels fonctionneront de manière substantiellement conforme à leur documentation. Cette garantie ne couvre pas les défauts résultant d'une utilisation non conforme, de modifications non autorisées ou de l'environnement technique du Client.</p>
            <p className="text-muted-foreground mb-4">15.2. En dehors de cette garantie expresse, la Solution est fournie « en l'état » (« as is »). L'Éditeur exclut toute autre garantie, expresse ou implicite, y compris les garanties d'adéquation à un usage particulier.</p>

            {/* Article 16 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 16 — Cession</h3>
            <p className="text-muted-foreground mb-4">Le Client ne peut céder tout ou partie du contrat à un tiers sans l'accord écrit préalable de l'Éditeur. L'Éditeur peut librement céder le contrat dans le cadre d'une restructuration ou d'un transfert d'activité.</p>

            {/* Article 17 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 17 — Modification des CGVU</h3>
            <p className="text-muted-foreground mb-2">17.1. L'Éditeur se réserve le droit de modifier les présentes CGVU à tout moment. Le Client sera informé de toute modification par notification dans l'application ou par email.</p>
            <p className="text-muted-foreground mb-4">17.2. La poursuite de l'utilisation des Logiciels après notification des modifications vaut acceptation des nouvelles CGVU. En cas de désaccord, le Client pourra résilier son abonnement dans les conditions prévues à l'Article 5.</p>

            {/* Article 18 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 18 — Intégralité et divisibilité</h3>
            <p className="text-muted-foreground mb-2">18.1. Les présentes CGVU constituent l'intégralité de l'accord entre les parties. Elles prévalent sur tout autre document, sauf convention particulière signée par les deux parties.</p>
            <p className="text-muted-foreground mb-2">18.2. Si l'une des clauses des présentes CGVU est déclarée nulle ou inapplicable, les autres clauses demeureront en vigueur et de plein effet.</p>
            <p className="text-muted-foreground mb-4">18.3. Le fait pour l'Éditeur de ne pas se prévaloir à un moment donné de l'une des clauses des présentes ne peut être interprété comme valant renonciation à s'en prévaloir ultérieurement.</p>

            {/* Article 19 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 19 — Droit applicable et juridiction compétente</h3>
            <p className="text-muted-foreground mb-4">Les présentes CGVU sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut d'accord amiable dans un délai de trente (30) jours, tout litige sera soumis à la compétence exclusive des tribunaux de Toulouse.</p>

            <Separator className="my-6" />
            <p className="text-xs text-muted-foreground text-center">
              Dernière mise à jour : février 2026
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── POLITIQUE DE CONFIDENTIALITÉ ─── */
function PolitiqueConfidentialite() {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScrollArea className="h-[600px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-0">Politique de Confidentialité</h2>
                <p className="text-sm text-muted-foreground">Conforme au RGPD (UE 2016/679) et à la Loi Informatique et Libertés</p>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-foreground">
                Chez {COMPANY.name}, nous accordons une importance primordiale à la protection de vos données 
                personnelles. La présente politique décrit comment nous collectons, utilisons, stockons et 
                protégeons vos données, conformément au Règlement Général sur la Protection des Données (RGPD — 
                Règlement UE 2016/679), à la Loi Informatique et Libertés n°78-17 du 6 janvier 1978 modifiée, 
                et à la directive ePrivacy 2002/58/CE.
              </p>
            </div>

            {/* 1. Responsable du traitement */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">1. Responsable du traitement</h3>
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
              <p className="text-muted-foreground mb-1"><strong>Responsable :</strong> {COMPANY.name}</p>
              <p className="text-muted-foreground mb-1"><strong>Adresse :</strong> {COMPANY.address}, {COMPANY.city}</p>
              <p className="text-muted-foreground mb-1"><strong>Délégué à la Protection des Données (DPO) :</strong> {COMPANY.dpo}</p>
              <p className="text-muted-foreground"><strong>Contact DPO :</strong> {COMPANY.email}</p>
            </div>

            {/* 2. Données collectées */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">2. Données personnelles collectées</h3>
            <p className="text-muted-foreground mb-2">Nous collectons les catégories de données suivantes :</p>
            <div className="space-y-3 mb-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="font-medium text-foreground text-sm">Données d'identification</p>
                <p className="text-xs text-muted-foreground">Nom, prénom, adresse email, numéro de téléphone, nom de l'entreprise, SIRET/SIREN</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="font-medium text-foreground text-sm">Données professionnelles</p>
                <p className="text-xs text-muted-foreground">Données relatives aux véhicules, chauffeurs, clients, itinéraires, coûts de transport, tournées, planning</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="font-medium text-foreground text-sm">Données de connexion</p>
                <p className="text-xs text-muted-foreground">Adresse IP, type de navigateur, système d'exploitation, pages consultées, horodatage des connexions, identifiant de licence</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="font-medium text-foreground text-sm">Données de géolocalisation</p>
                <p className="text-xs text-muted-foreground">Adresses de départ, d'arrivée et étapes saisies pour le calcul d'itinéraires (pas de géolocalisation en temps réel)</p>
              </div>
            </div>

            {/* 3. Bases légales */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">3. Bases légales du traitement (Art. 6 RGPD)</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-2 space-y-2">
              <li><strong>Exécution du contrat</strong> (Art. 6.1.b) : traitement nécessaire à la fourniture des services d'abonnement SaaS</li>
              <li><strong>Intérêt légitime</strong> (Art. 6.1.f) : amélioration des services, prévention de la fraude, sécurité informatique</li>
              <li><strong>Obligation légale</strong> (Art. 6.1.c) : conservation des données de facturation (Code de commerce, Code général des impôts)</li>
              <li><strong>Consentement</strong> (Art. 6.1.a) : envoi de communications commerciales et newsletters (le cas échéant)</li>
            </ul>

            {/* 4. Finalités */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">4. Finalités du traitement</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-2 space-y-1">
              <li>Fourniture, gestion et amélioration des Logiciels</li>
              <li>Gestion des comptes clients et de la facturation</li>
              <li>Support technique et assistance</li>
              <li>Sécurisation de l'accès et prévention des usages frauduleux</li>
              <li>Respect des obligations légales et réglementaires</li>
              <li>Établissement de statistiques agrégées et anonymisées sur l'utilisation</li>
            </ul>

            {/* 5. Durée de conservation */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">5. Durée de conservation</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Type de données</th>
                    <th className="text-left p-3 font-semibold text-foreground">Durée</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border"><td className="p-3">Données de compte</td><td className="p-3">Durée du contrat + 3 ans</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Données de facturation</td><td className="p-3">10 ans (obligation légale — Art. L.123-22 du Code de commerce)</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Données de connexion (logs)</td><td className="p-3">1 an (LCEN — Loi n°2004-575)</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Données métier (itinéraires, tournées)</td><td className="p-3">Durée du contrat + 30 jours</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Cookies</td><td className="p-3">13 mois maximum (recommandation CNIL)</td></tr>
                </tbody>
              </table>
            </div>

            {/* 6. Destinataires */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">6. Destinataires des données</h3>
            <p className="text-muted-foreground mb-2">Vos données peuvent être transmises aux catégories de destinataires suivantes :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-2 space-y-1">
              <li><strong>Personnel habilité</strong> de {COMPANY.name} (support technique, administration)</li>
              <li><strong>Sous-traitants techniques</strong> : hébergement cloud (serveurs UE), services de calcul d'itinéraires (TomTom, Google Maps), services d'email transactionnel</li>
              <li><strong>Autorités compétentes</strong> en cas d'obligation légale</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              Aucune donnée n'est vendue à des tiers. En cas de transfert hors UE, des garanties appropriées 
              sont mises en place (clauses contractuelles types de la Commission européenne conformément à 
              l'article 46 du RGPD, ou décision d'adéquation conformément à l'article 45).
            </p>

            {/* 7. Sécurité */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">7. Mesures de sécurité</h3>
            <p className="text-muted-foreground mb-2">Conformément à l'article 32 du RGPD, nous mettons en œuvre les mesures suivantes :</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 ml-2 space-y-1">
              <li>Chiffrement des données en transit (TLS 1.2+) et au repos (AES-256)</li>
              <li>Authentification sécurisée avec contrôle d'accès par rôle (RBAC)</li>
              <li>Isolation des données par entreprise (multi-tenant sécurisé avec Row Level Security)</li>
              <li>Sauvegardes automatiques régulières</li>
              <li>Journalisation des accès et des actions sensibles (audit trail)</li>
              <li>Limitation du nombre de tentatives de connexion (rate limiting)</li>
              <li>Tests de sécurité réguliers</li>
            </ul>

            {/* 8. Droits */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">8. Vos droits (Articles 15 à 22 du RGPD)</h3>
            <p className="text-muted-foreground mb-2">Conformément au RGPD et à la Loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                { title: "Droit d'accès (Art. 15)", desc: "Obtenir confirmation du traitement et une copie de vos données" },
                { title: "Droit de rectification (Art. 16)", desc: "Corriger vos données inexactes ou incomplètes" },
                { title: "Droit à l'effacement (Art. 17)", desc: "Demander la suppression de vos données (« droit à l'oubli »)" },
                { title: "Droit à la limitation (Art. 18)", desc: "Obtenir la limitation du traitement dans certains cas" },
                { title: "Droit à la portabilité (Art. 20)", desc: "Recevoir vos données dans un format structuré et lisible par machine" },
                { title: "Droit d'opposition (Art. 21)", desc: "Vous opposer au traitement fondé sur l'intérêt légitime" },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-muted/30 p-3 rounded-lg">
                  <p className="font-medium text-foreground text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mb-2">
              Pour exercer vos droits, adressez votre demande à : <strong>{COMPANY.email}</strong> ou par 
              courrier à : {COMPANY.name}, {COMPANY.address}, {COMPANY.city}.
            </p>
            <p className="text-muted-foreground mb-4">
              Nous nous engageons à répondre dans un délai d'un (1) mois conformément à l'article 12.3 du RGPD. 
              En cas de demande complexe, ce délai peut être prolongé de deux (2) mois.
            </p>

            {/* 9. Réclamation */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">9. Droit de réclamation</h3>
            <p className="text-muted-foreground mb-4">
              Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous avez le 
              droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des 
              Libertés (CNIL) — <strong>www.cnil.fr</strong> — conformément à l'article 77 du RGPD.
            </p>

            {/* 10. Sous-traitants */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">10. Accord de sous-traitance (Art. 28 RGPD)</h3>
            <p className="text-muted-foreground mb-4">
              Lorsque le Client agit en tant que responsable de traitement et saisit des données personnelles 
              de ses propres collaborateurs ou clients dans les Logiciels, {COMPANY.name} agit en qualité de 
              sous-traitant. Un accord de traitement des données (DPA — Data Processing Agreement) est 
              disponible sur demande à {COMPANY.email}.
            </p>

            {/* 11. Lois applicables */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">11. Cadre juridique applicable</h3>
            <div className="bg-muted/30 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Textes de référence :</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>Règlement (UE) 2016/679 — Règlement Général sur la Protection des Données (RGPD)</li>
                <li>Loi n°78-17 du 6 janvier 1978 — Loi Informatique et Libertés (modifiée)</li>
                <li>Directive 2002/58/CE — Directive ePrivacy (vie privée et communications électroniques)</li>
                <li>Loi n°2004-575 du 21 juin 2004 — Loi pour la Confiance dans l'Économie Numérique (LCEN)</li>
                <li>Règlement (UE) 2023/2854 — Data Act (en vigueur depuis le 12 septembre 2025)</li>
                <li>Règlement (UE) 2022/868 — Data Governance Act</li>
                <li>Articles L.123-22 et suivants du Code de commerce (conservation des données comptables)</li>
              </ul>
            </div>

            <Separator className="my-6" />
            <p className="text-xs text-muted-foreground text-center">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── COOKIES ─── */
function PolitiqueCookies() {
  return (
    <Card>
      <CardContent className="pt-6">
        <ScrollArea className="h-[600px] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-0">Politique des Cookies</h2>
                <p className="text-sm text-muted-foreground">Conforme à la directive ePrivacy et aux recommandations de la CNIL</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Qu'est-ce qu'un cookie ?</h3>
            <p className="text-muted-foreground mb-4">
              Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) 
              lors de votre visite sur une application web. Il permet de conserver des informations relatives à 
              votre navigation et d'améliorer votre expérience utilisateur.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Cookies utilisés</h3>
            <p className="text-muted-foreground mb-3">
              Les Logiciels n'utilisent que des cookies et stockage local strictement nécessaires au fonctionnement 
              du service. Aucun cookie publicitaire ni de tracking tiers n'est utilisé.
            </p>

            <div className="space-y-3 mb-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Cookies strictement nécessaires (exemptés de consentement — CNIL)</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                  <li><strong>Session d'authentification</strong> — Maintien de votre connexion sécurisée (JWT token)</li>
                  <li><strong>Vérification de licence</strong> — Validation de votre abonnement actif</li>
                  <li><strong>Préférences utilisateur</strong> — Thème (clair/sombre), langue, état de la barre latérale</li>
                  <li><strong>Stockage local (localStorage)</strong> — Cache local pour les performances applicatives</li>
                </ul>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Durée de conservation</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-semibold text-foreground">Cookie</th>
                    <th className="text-left p-3 font-semibold text-foreground">Durée</th>
                    <th className="text-left p-3 font-semibold text-foreground">Finalité</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border"><td className="p-3">Session JWT</td><td className="p-3">Session navigateur</td><td className="p-3">Authentification</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Refresh token</td><td className="p-3">30 jours</td><td className="p-3">Reconnexion automatique</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Préférences UI</td><td className="p-3">1 an</td><td className="p-3">Confort d'utilisation</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Cache données</td><td className="p-3">Variable</td><td className="p-3">Performance</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Gestion des cookies</h3>
            <p className="text-muted-foreground mb-4">
              Vous pouvez configurer votre navigateur pour refuser les cookies. Toutefois, la désactivation des 
              cookies strictement nécessaires empêchera le fonctionnement normal des Logiciels (authentification, 
              sauvegarde des préférences). Pour plus d'informations sur la gestion des cookies, consultez le 
              site de la CNIL : <strong>www.cnil.fr/fr/cookies-et-autres-traceurs</strong>.
            </p>

            <Separator className="my-6" />
            <p className="text-xs text-muted-foreground text-center">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ─── EXPORT ─── */
export default function LegalTabs() {
  return (
    <Tabs defaultValue="mentions" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="mentions">Mentions légales</TabsTrigger>
        <TabsTrigger value="cgv">CGV / CGU</TabsTrigger>
        <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
        <TabsTrigger value="cookies">Cookies</TabsTrigger>
      </TabsList>

      <TabsContent value="mentions" className="mt-6"><MentionsLegales /></TabsContent>
      <TabsContent value="cgv" className="mt-6"><CGV /></TabsContent>
      <TabsContent value="privacy" className="mt-6"><PolitiqueConfidentialite /></TabsContent>
      <TabsContent value="cookies" className="mt-6"><PolitiqueCookies /></TabsContent>
    </Tabs>
  );
}
