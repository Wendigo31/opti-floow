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
                L'ensemble du contenu des logiciels OptiFlow, Drive Profit et Line Optimizer 
                (ci-après « les Logiciels ») — incluant sans s'y limiter les textes, graphismes, 
                images, logos, icônes, sons, logiciels, bases de données, algorithmes, architecture 
                technique et code source — est la propriété exclusive de {COMPANY.name} et est protégé 
                par les lois françaises et internationales relatives à la propriété intellectuelle 
                (Code de la propriété intellectuelle, directive européenne 2009/24/CE relative à la 
                protection juridique des programmes d'ordinateur, Convention de Berne).
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
                <p className="text-sm text-muted-foreground">En vigueur au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-foreground font-medium">
                L'utilisation des Logiciels édités par {COMPANY.name} implique l'acceptation pleine et 
                entière des présentes CGVU. Toute utilisation contraire aux présentes conditions expose 
                le contrevenant à des poursuites judiciaires.
              </p>
            </div>

            {/* Article 1 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 1 — Objet</h3>
            <p className="text-muted-foreground mb-4">
              Les présentes Conditions Générales de Vente et d'Utilisation (CGVU) ont pour objet de 
              définir les conditions dans lesquelles {COMPANY.name} (ci-après « l'Éditeur ») fournit 
              au Client l'accès aux logiciels OptiFlow, Drive Profit et Line Optimizer (ci-après 
              « les Logiciels ») dans le cadre d'un abonnement SaaS (Software as a Service).
            </p>

            {/* Article 2 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 2 — Licence d'utilisation</h3>
            <p className="text-muted-foreground mb-2">2.1. L'Éditeur concède au Client une licence d'utilisation non-exclusive, non-cessible et non-transférable sur les Logiciels, pour la durée de l'abonnement souscrit.</p>
            <p className="text-muted-foreground mb-2">2.2. Cette licence est strictement limitée à l'usage interne et professionnel du Client, pour le nombre d'utilisateurs défini dans le forfait choisi.</p>
            <p className="text-muted-foreground mb-4">2.3. La licence est attachée à un identifiant société unique. Tout partage, prêt, revente ou mise à disposition de cet identifiant à des tiers est formellement interdit.</p>

            {/* Article 3 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 3 — Durée et engagement</h3>
            <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Engagement contractuel</p>
                  <p className="text-sm text-muted-foreground">
                    Tout abonnement souscrit à l'un des forfaits proposés (Essentiel, Professionnel, 
                    Entreprise ou tout autre forfait) engage le Client pour une durée minimale de douze (12) 
                    mois à compter de la date d'activation de la licence.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mb-2">3.1. L'abonnement est conclu pour une période initiale incompressible de douze (12) mois (ci-après « la Période d'Engagement »).</p>
            <p className="text-muted-foreground mb-2">3.2. À l'expiration de la Période d'Engagement, l'abonnement est automatiquement reconduit par périodes successives de douze (12) mois, sauf dénonciation par l'une des parties adressée par lettre recommandée avec accusé de réception ou par email avec confirmation, avec un préavis de deux (2) mois avant l'échéance en cours.</p>
            <p className="text-muted-foreground mb-2">3.3. En cas de résiliation anticipée par le Client avant le terme de la Période d'Engagement, l'intégralité des mensualités restantes jusqu'à la fin de la période d'engagement sera due à titre d'indemnité forfaitaire.</p>
            <p className="text-muted-foreground mb-4">3.4. Le changement de forfait vers un forfait supérieur est possible à tout moment. Le passage à un forfait inférieur ne prendra effet qu'à l'échéance de la Période d'Engagement en cours.</p>

            {/* Article 4 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 4 — Tarifs et paiement</h3>
            <p className="text-muted-foreground mb-2">4.1. Les prix des abonnements sont ceux en vigueur au jour de la souscription, exprimés en euros hors taxes (HT). La TVA applicable sera ajoutée au taux en vigueur.</p>
            <p className="text-muted-foreground mb-2">4.2. Le paiement est dû mensuellement ou annuellement selon la formule choisie, par prélèvement automatique, virement bancaire ou tout autre moyen accepté par l'Éditeur.</p>
            <p className="text-muted-foreground mb-2">4.3. Tout retard de paiement entraînera de plein droit, sans mise en demeure préalable, l'application de pénalités de retard égales à trois (3) fois le taux d'intérêt légal, ainsi qu'une indemnité forfaitaire de recouvrement de 40 euros conformément aux articles L.441-10 et D.441-5 du Code de commerce.</p>
            <p className="text-muted-foreground mb-4">4.4. L'Éditeur se réserve le droit de suspendre l'accès aux Logiciels en cas de défaut de paiement non régularisé dans un délai de quinze (15) jours suivant une mise en demeure adressée par email.</p>

            {/* Article 5 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 5 — Interdictions et propriété intellectuelle</h3>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Il est formellement interdit au Client de :</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-2 space-y-1">
                <li>Copier, reproduire, dupliquer tout ou partie des Logiciels, de leur code source, de leur architecture ou de leurs algorithmes</li>
                <li>Décompiler, désassembler, procéder à de l'ingénierie inverse (reverse engineering) ou tenter d'accéder au code source des Logiciels</li>
                <li>Modifier, adapter, traduire ou créer des œuvres dérivées à partir des Logiciels</li>
                <li>Sous-licencier, louer, prêter, distribuer ou mettre à disposition les Logiciels à des tiers</li>
                <li>Supprimer ou altérer les mentions de propriété intellectuelle, marques, logos ou notices de copyright</li>
                <li>Utiliser les Logiciels à des fins illicites, frauduleuses ou portant atteinte aux droits de tiers</li>
                <li>Contourner, désactiver ou interférer avec les mécanismes de sécurité, de licence ou de limitation d'accès</li>
                <li>Extraire ou réutiliser de manière systématique le contenu des bases de données des Logiciels</li>
                <li>Utiliser des robots, scrapers ou tout moyen automatisé pour accéder aux Logiciels</li>
                <li>Partager ses identifiants de connexion avec des personnes non autorisées</li>
              </ul>
            </div>
            <p className="text-muted-foreground mb-4">
              5.2. Les Logiciels, leur documentation, les mises à jour et toute création intellectuelle associée 
              demeurent la propriété exclusive de l'Éditeur. Le Client ne dispose que d'un droit d'utilisation 
              conformément à la licence concédée. Les droits de propriété intellectuelle sont protégés par le 
              Code de la propriété intellectuelle (articles L.111-1 et suivants, L.122-4, L.335-2 et suivants) 
              et la directive européenne 2009/24/CE.
            </p>

            {/* Article 6 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 6 — Données du Client</h3>
            <p className="text-muted-foreground mb-2">6.1. Le Client reste propriétaire de l'ensemble des données qu'il saisit ou importe dans les Logiciels.</p>
            <p className="text-muted-foreground mb-2">6.2. L'Éditeur s'engage à ne pas accéder aux données du Client sauf à des fins de support technique, avec l'accord préalable du Client, ou en cas d'obligation légale.</p>
            <p className="text-muted-foreground mb-4">6.3. En cas de cessation du contrat, le Client dispose d'un délai de trente (30) jours pour exporter ses données via les fonctionnalités d'export des Logiciels. Passé ce délai, l'Éditeur pourra procéder à la suppression définitive des données.</p>

            {/* Article 7 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 7 — Disponibilité et maintenance</h3>
            <p className="text-muted-foreground mb-2">7.1. L'Éditeur s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité des Logiciels 24h/24 et 7j/7, sous réserve des opérations de maintenance.</p>
            <p className="text-muted-foreground mb-2">7.2. L'Éditeur se réserve le droit d'interrompre temporairement l'accès pour des opérations de maintenance, mise à jour ou amélioration. Le Client sera informé dans la mesure du possible avec un préavis raisonnable.</p>
            <p className="text-muted-foreground mb-4">7.3. L'Éditeur ne saurait être tenu responsable des interruptions dues à des cas de force majeure, à des défaillances des réseaux de télécommunication ou à des actes de tiers.</p>

            {/* Article 8 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 8 — Responsabilité et garantie</h3>
            <p className="text-muted-foreground mb-2">8.1. Les Logiciels sont fournis « en l'état ». L'Éditeur ne garantit pas que les Logiciels répondront à l'ensemble des besoins spécifiques du Client.</p>
            <p className="text-muted-foreground mb-2">8.2. La responsabilité de l'Éditeur est limitée aux dommages directs et prévisibles. En tout état de cause, la responsabilité totale de l'Éditeur ne pourra excéder le montant des sommes effectivement versées par le Client au cours des douze (12) derniers mois.</p>
            <p className="text-muted-foreground mb-2">8.3. L'Éditeur ne pourra en aucun cas être tenu responsable des dommages indirects, pertes de données, pertes d'exploitation, manque à gagner ou préjudice commercial.</p>
            <p className="text-muted-foreground mb-4">8.4. Le Client est seul responsable de l'utilisation qu'il fait des Logiciels et des décisions prises sur la base des résultats fournis (calculs de coûts, optimisations, prévisions). Les données et calculs fournis par les Logiciels sont indicatifs et ne constituent pas un conseil professionnel.</p>

            {/* Article 9 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 9 — Résiliation pour manquement</h3>
            <p className="text-muted-foreground mb-2">9.1. En cas de manquement grave par le Client à l'une quelconque des obligations prévues aux présentes CGVU, et notamment en cas de violation de l'Article 5 (Interdictions), l'Éditeur pourra résilier de plein droit le contrat, sans préavis ni indemnité, par notification écrite (email ou lettre recommandée).</p>
            <p className="text-muted-foreground mb-2">9.2. La résiliation pour manquement ne dispense pas le Client du paiement des sommes restant dues au titre de la Période d'Engagement.</p>
            <p className="text-muted-foreground mb-4">9.3. L'Éditeur se réserve le droit d'engager toute action en justice pour obtenir réparation du préjudice subi du fait de la violation des présentes CGVU, notamment en cas de contrefaçon (articles L.335-2 et suivants du Code de la propriété intellectuelle), de concurrence déloyale ou de parasitisme.</p>

            {/* Article 10 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 10 — Confidentialité</h3>
            <p className="text-muted-foreground mb-2">10.1. Chaque partie s'engage à traiter comme confidentielles toutes les informations échangées dans le cadre du contrat et à ne pas les divulguer à des tiers sans l'accord préalable écrit de l'autre partie.</p>
            <p className="text-muted-foreground mb-4">10.2. Cette obligation de confidentialité survivra pendant une durée de cinq (5) ans après la cessation du contrat, quelle qu'en soit la cause.</p>

            {/* Article 11 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 11 — Protection des données personnelles</h3>
            <p className="text-muted-foreground mb-2">11.1. L'Éditeur agit en qualité de sous-traitant au sens du RGPD (Règlement UE 2016/679) pour le traitement des données personnelles saisies par le Client dans les Logiciels. Le Client est responsable de traitement.</p>
            <p className="text-muted-foreground mb-2">11.2. L'Éditeur s'engage à traiter les données uniquement sur instruction documentée du Client, à assurer la confidentialité des données, à mettre en œuvre les mesures techniques et organisationnelles appropriées, et à notifier le Client en cas de violation de données dans un délai de 72 heures.</p>
            <p className="text-muted-foreground mb-4">11.3. Les détails du traitement des données sont précisés dans la Politique de Confidentialité accessible depuis les paramètres de l'application.</p>

            {/* Article 12 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 12 — Support technique</h3>
            <p className="text-muted-foreground mb-2">12.1. Le support technique est accessible par email à {COMPANY.email} ou par téléphone au {COMPANY.phone}, du lundi au vendredi de 9h à 18h (heure de Paris), hors jours fériés.</p>
            <p className="text-muted-foreground mb-4">12.2. L'Éditeur s'engage à répondre aux demandes de support dans un délai raisonnable. Les délais de résolution dépendent de la complexité et de la criticité de l'incident signalé.</p>

            {/* Article 13 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 13 — Force majeure</h3>
            <p className="text-muted-foreground mb-4">
              Aucune des parties ne pourra être tenue responsable de l'inexécution de ses obligations 
              contractuelles en cas de survenance d'un événement de force majeure au sens de l'article 
              1218 du Code civil, notamment : catastrophe naturelle, pandémie, guerre, acte de terrorisme, 
              grève, incendie, inondation, panne de réseau Internet, cyberattaque, décision gouvernementale 
              ou toute autre circonstance indépendante de la volonté des parties.
            </p>

            {/* Article 14 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 14 — Modification des CGVU</h3>
            <p className="text-muted-foreground mb-2">14.1. L'Éditeur se réserve le droit de modifier les présentes CGVU à tout moment. Le Client sera informé de toute modification par notification dans l'application ou par email.</p>
            <p className="text-muted-foreground mb-4">14.2. La poursuite de l'utilisation des Logiciels après notification des modifications vaut acceptation des nouvelles CGVU. En cas de désaccord, le Client pourra résilier son abonnement dans les conditions prévues à l'Article 3.</p>

            {/* Article 15 */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Article 15 — Dispositions générales</h3>
            <p className="text-muted-foreground mb-2">15.1. Si l'une quelconque des dispositions des présentes CGVU est déclarée nulle ou inapplicable, les autres dispositions resteront en vigueur.</p>
            <p className="text-muted-foreground mb-2">15.2. Le fait pour l'Éditeur de ne pas se prévaloir à un moment donné de l'une des clauses des présentes ne peut être interprété comme valant renonciation à s'en prévaloir ultérieurement.</p>
            <p className="text-muted-foreground mb-4">15.3. Les présentes CGVU sont régies par le droit français. En cas de litige, compétence exclusive est attribuée aux tribunaux de Toulouse (France).</p>

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
