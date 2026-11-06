import { useState } from 'react';
import { Settings as SettingsIcon, FileText, HelpCircle, HardDrive, Info as InfoIcon } from 'lucide-react';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AddonMarketplace } from '@/components/settings/AddonMarketplace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseContext } from '@/context/LicenseContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ContactDialog } from '@/components/ContactDialog';
import { CompanyDocumentsDialog } from '@/components/CompanyDocuments';
import { OptiSettingsPage } from '@/components/opti-settings/OptiSettingsPage';
import { CHANGELOG } from '@/lib/changelog';
import { isPathHidden, useCompanyAccess } from '@/lib/companyAccess';

/** Onglets d'OptiFlow (même liste que dans OptiCentral). */
const FLOW_PAGES = [
  { path: '/planning', label: 'Planning', space: 'Exploitation' },
  { path: '/tours', label: 'Tournées', space: 'Exploitation' },
  { path: '/line-montage', label: 'Création de ligne', space: 'Exploitation' },
  { path: '/itinerary', label: 'Itinéraire', space: 'Exploitation' },
  { path: '/calculator', label: 'Calculateur', space: 'Exploitation' },
  { path: '/history', label: 'Historique des trajets', space: 'Exploitation' },
  { path: '/clients', label: 'Clients', space: 'Exploitation' },
  { path: '/pallets', label: 'Palettes', space: 'Exploitation' },
  { path: '/ai-analysis', label: 'Analyse par IA', space: 'Géoloc' },
  { path: '/vehicles', label: 'Véhicules', space: 'Gestion de parc' },
  { path: '/vehicle-reports', label: 'Rapports véhicules', space: 'Gestion de parc' },
  { path: '/drivers', label: 'Conducteurs', space: 'RH' },
  { path: '/team', label: 'Équipe', space: 'RH' },
  { path: '/tenders', label: 'Devis par client', space: "Appels d'offres" },
  { path: '/invoices', label: 'Factures', space: 'Comptabilité' },
  { path: '/charges', label: 'Charges fixes', space: 'Comptabilité' },
  { path: '/dashboard', label: 'Analyse', space: 'Gestion de rentabilité' },
  { path: '/forecast', label: 'Prévisionnel', space: 'Gestion de rentabilité' },
];

const FAQ = [
  { q: 'Comment changer de forfait ?', a: 'Écrivez au support (bouton Support ou support@opti-group.fr) : le changement se fait sans nouveau code.' },
  { q: 'Mes données sont-elles sécurisées ?', a: "Oui : elles sont hébergées en Union européenne, séparées de celles des autres sociétés, et chaque membre n'accède qu'à ce que permet son rôle." },
  { q: 'Comment résilier mon abonnement ?', a: 'À tout moment, par e-mail à support@opti-group.fr. La résiliation prend effet à la fin de la période en cours.' },
  { q: 'Puis-je récupérer mes données ?', a: "Oui : Paramètres › Fichier › Exporter au format .opp (Direction). Pour un autre format, contactez le support." },
  { q: 'Comment contacter le support ?', a: 'Avec le bouton Support, du lundi au vendredi de 9 h à 18 h, ou par e-mail à support@opti-group.fr.' },
];

export default function Settings() {
  const { licenseData, hasFeature } = useLicense();
  const { licenseId } = useLicenseContext();
  const { access } = useCompanyAccess(licenseId);
  const [docsOpen, setDocsOpen] = useState(false);
  const [alwaysAskLocation, setAlwaysAskLocation] = useLocalStorage('optiflow-always-ask-download-location', true);

  const features = FLOW_PAGES.map((p) => ({
    label: p.label,
    space: p.space,
    active: !isPathHidden(access.hidden_pages, p.path) && (p.path !== '/line-montage' || hasFeature('ai_optimization')),
  }));
  const address = [licenseData?.address, [licenseData?.postalCode, licenseData?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const documents = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documents légaux</CardTitle>
        <CardDescription>Extrait Kbis et licence de transport de la société.</CardDescription>
      </CardHeader>
      <CardContent>
        {licenseId && (
          <>
            <Button variant="outline" className="gap-2" onClick={() => setDocsOpen(true)}>
              <FileText className="w-4 h-4" /> Mettre en ligne / voir les documents légaux
            </Button>
            <CompanyDocumentsDialog licenseId={licenseId} open={docsOpen} onOpenChange={setDocsOpen} />
          </>
        )}
      </CardContent>
    </Card>
  );

  const appSettings = (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary" /> Téléchargements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="ask-location">Toujours demander l'emplacement</Label>
              <p className="text-sm text-muted-foreground">Affiche le choix du dossier à chaque téléchargement (PDF, Excel…).</p>
            </div>
            <Switch id="ask-location" checked={alwaysAskLocation} onCheckedChange={setAlwaysAskLocation} />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <InfoIcon className="h-4 w-4 shrink-0" /> Désactivé, les fichiers vont dans le dossier Téléchargements de votre navigateur.
          </p>
        </CardContent>
      </Card>
      <AddonMarketplace />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary" /> Questions fréquentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent><p className="text-sm text-muted-foreground">{f.a}</p></AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground">Votre société, votre application, vos données et les informations légales</p>
          </div>
        </div>
        <ContactDialog
          userEmail={licenseData?.email}
          userName={`${licenseData?.firstName || ''} ${licenseData?.lastName || ''}`.trim()}
          companyName={licenseData?.companyName}
          licenseCode={licenseData?.code}
        />
      </div>

      <OptiSettingsPage
        app="optiflow"
        appName="OptiFlow"
        company={{
          name: licenseData?.companyName,
          identifier: licenseData?.code,
          siren: licenseData?.siren,
          address,
          email: licenseData?.email,
          plan: licenseData?.planName ?? null,
        }}
        documents={documents}
        notifications={<NotificationSettings />}
        appSettings={appSettings}
        features={features}
        changelog={CHANGELOG}
        onReplayTutorial={() => window.dispatchEvent(new CustomEvent('optiflow:replay-tutorial'))}
      />

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        <p>© {new Date().getFullYear()} OptiFlow — SAS OptiGroup. Tous droits réservés.</p>
        <p className="mt-1">V{CHANGELOG[0].version}</p>
      </div>
    </div>
  );
}
