import { useState, useRef } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { KeyRound, Building2, User, MapPin, Copyright, Shield, FileText, Mail, Phone, Scale, Lock, Eye, Database, UserCheck, AlertCircle, HelpCircle, Download, Upload, FolderOpen, HardDrive, Info as InfoIcon, Settings, RefreshCw } from 'lucide-react';
import { ContactDialog } from '@/components/ContactDialog';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { exportAllData, importAllData } from '@/utils/dataExport';
import { saveFileWithPicker } from '@/utils/fileSave';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Version basée sur l'historique des modifications du projet ou mise à jour depuis la notification
const BASE_VERSION = '1.24.0';
const getAppVersion = () => {
  const storedVersion = localStorage.getItem('optiflow_current_version');
  return storedVersion ? `v${storedVersion}` : `v${BASE_VERSION}`;
};

const Info = () => {
  const { licenseData, refreshLicense } = useLicense();
  const { exportProfile, importProfile } = useApp();
  const [importText, setImportText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const dataFileInputRef = useRef<HTMLInputElement>(null);
  const [alwaysAskLocation, setAlwaysAskLocation] = useLocalStorage('optiflow-always-ask-download-location', true);
  const [lastDownloadFolder, setLastDownloadFolder] = useLocalStorage<string | null>('optiflow-last-download-folder', null);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await refreshLicense();
      toast.success('Licence synchronisée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportProfile = async () => {
    const encryptedData = exportProfile();
    const saved = await saveFileWithPicker(encryptedData, {
      suggestedName: `optiflow_profile_${new Date().toISOString().split('T')[0]}.opp`,
      types: [{ description: 'Fichier profil OptiFlow', accept: { 'text/plain': ['.opp'] } }]
    });
    if (saved) {
      toast.success('Profil exporté avec succès');
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importProfile(content)) {
        toast.success('Profil importé avec succès');
      } else {
        toast.error('Fichier de profil invalide');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportText = () => {
    if (!importText.trim()) {
      toast.error('Veuillez coller les données du profil');
      return;
    }
    if (importProfile(importText.trim())) {
      toast.success('Profil importé avec succès');
      setImportText('');
    } else {
      toast.error('Données de profil invalides');
    }
  };

  const handleExportData = async () => {
    const saved = await exportAllData();
    if (saved) {
      toast.success('Données exportées avec succès');
    }
  };

  const handleImportDataFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importAllData(content);
      if (result.success) {
        toast.success(`${result.message} - ${result.counts?.clients} clients, ${result.counts?.trips} trajets, ${result.counts?.quotes} devis`);
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Informations</h1>
          <p className="text-muted-foreground mt-1">Détails de votre licence, entreprise et informations légales</p>
        </div>
        <ContactDialog 
          userEmail={licenseData?.email}
          userName={`${licenseData?.firstName || ''} ${licenseData?.lastName || ''}`.trim()}
          companyName={licenseData?.companyName}
          licenseCode={licenseData?.code}
        />
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:w-[900px]">
          <TabsTrigger value="account">Mon compte</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="mentions">Mentions légales</TabsTrigger>
          <TabsTrigger value="cgv">CGV / CGU</TabsTrigger>
          <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Licence */}
            {(licenseData?.showLicenseInfo !== false) && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Licence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Code licence</span>
                    <Badge variant="outline" className="font-mono">
                      {licenseData?.code || 'Non disponible'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Activée le</span>
                    <span className="text-foreground">
                      {licenseData?.activatedAt 
                        ? new Date(licenseData.activatedAt).toLocaleDateString('fr-FR')
                        : 'Non disponible'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Utilisateur */}
            {(licenseData?.showUserInfo !== false) && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Utilisateur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nom</span>
                    <span className="text-foreground">
                      {licenseData?.lastName || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Prénom</span>
                    <span className="text-foreground">
                      {licenseData?.firstName || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-foreground">
                      {licenseData?.email || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Entreprise */}
            {(licenseData?.showCompanyInfo !== false) && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Entreprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Raison sociale</span>
                    <span className="text-foreground">{licenseData?.companyName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SIREN</span>
                    <span className="text-foreground font-mono">{licenseData?.siren || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="text-foreground">{licenseData?.companyStatus || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Effectif</span>
                    <span className="text-foreground">{licenseData?.employeeCount ?? '-'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adresse */}
            {(licenseData?.showAddressInfo !== false) && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle>Adresse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Adresse</span>
                    <span className="text-foreground">{licenseData?.address || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Code postal</span>
                    <span className="text-foreground">{licenseData?.postalCode || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="text-foreground">{licenseData?.city || '-'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Synchronisation */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Synchronisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Récupérez les dernières modifications apportées à votre licence par l'administrateur.
                </p>
                <Button 
                  onClick={handleForceSync} 
                  disabled={isSyncing}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Synchronisation...' : 'Forcer la synchronisation'}
                </Button>
              </CardContent>
            </Card>

            {/* Version */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <InfoIcon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Version</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version de l'application</span>
                  <Badge variant="secondary" className="font-mono text-sm">
                    {getAppVersion()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Export/Import */}
            <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Profil (configuration)</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Exportez votre configuration (conducteurs, charges, véhicule) pour la sauvegarder.
                  </p>
                  <Button onClick={handleExportProfile} className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter le profil (.opp)
                  </Button>
                </div>
                
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Importez un profil depuis un fichier .opp
                  </p>
                  <input
                    type="file"
                    accept=".opp"
                    onChange={handleImportFile}
                    className="hidden"
                    id="profile-file-input"
                  />
                  <Button 
                    onClick={() => document.getElementById('profile-file-input')?.click()} 
                    className="w-full" 
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importer un profil (.opp)
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Ou collez les données du profil
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Coller les données ici..."
                      className="flex-1"
                    />
                    <Button onClick={handleImportText} variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Export/Import (clients, trips, quotes) */}
            <div className="glass-card p-6 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-warning" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Données (clients, trajets, devis)</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Exportez vos données métier (clients, trajets, devis) au format JSON.
                  </p>
                  <Button onClick={handleExportData} className="w-full" variant="outline">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Exporter les données (.json)
                  </Button>
                </div>
                
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Importez des données depuis un fichier JSON exporté précédemment.
                  </p>
                  <input
                    ref={dataFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportDataFile}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => dataFileInputRef.current?.click()} 
                    className="w-full" 
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importer des données (.json)
                  </Button>
                </div>
              </div>
            </div>

            {/* Download Settings */}
            <div className="glass-card p-6 opacity-0 animate-slide-up lg:col-span-2" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Téléchargements</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="ask-location">Toujours demander l'emplacement</Label>
                    <p className="text-sm text-muted-foreground">
                      Affiche le sélecteur de dossier à chaque téléchargement
                    </p>
                  </div>
                  <Switch
                    id="ask-location"
                    checked={alwaysAskLocation}
                    onCheckedChange={setAlwaysAskLocation}
                  />
                </div>

                <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Comment ça fonctionne</p>
                    <p>
                      Lorsque vous téléchargez un fichier (PDF, Excel, etc.), le navigateur vous propose de choisir 
                      l'emplacement de sauvegarde. Si cette option est désactivée, les fichiers seront téléchargés 
                      dans le dossier par défaut de votre navigateur (généralement "Téléchargements").
                    </p>
                  </div>
                </div>

                {lastDownloadFolder && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Dernier dossier utilisé :</p>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">{lastDownloadFolder}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLastDownloadFolder(null)}
                      >
                        Effacer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mentions" className="mt-6">
          <div className="glass-card p-6">
            <ScrollArea className="h-[600px] pr-4">
              {/* Company Info Cards */}
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
                        <p className="font-semibold text-foreground">SAS OptiFleet</p>
                        <p className="text-sm text-muted-foreground">Société par Actions Simplifiée</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-foreground">10B chemin de la claou</p>
                        <p className="text-foreground">31790 Saint-Jory, France</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">+33 6 46 69 14 62</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">yanis.dini3121@gmail.com</p>
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
                      <p className="text-muted-foreground">M. Yanis Dini, Président</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="font-semibold text-foreground">Responsable de la rédaction</p>
                      <p className="text-muted-foreground">Mme Noémie Dini, Directrice Marketing</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="font-semibold text-foreground">Contact rédaction</p>
                      <p className="text-muted-foreground">yanis.dini3121@gmail.com</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="w-5 h-5 text-primary" />
                      Hébergement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">Supabase Inc.</p>
                      <p className="text-sm text-muted-foreground">Hébergeur cloud</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>970 Toa Payoh North</p>
                      <p>Singapore 318992</p>
                    </div>
                    <p className="text-sm text-foreground">https://supabase.com</p>
                    <Separator className="my-3" />
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Les données sont hébergées sur des serveurs sécurisés en Union Européenne, 
                        conformément au RGPD.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-primary" />
                      Protection des données
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">Délégué à la Protection des Données (DPO)</p>
                      <p className="text-muted-foreground">M. Yanis Dini</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">yanis.dini3121@gmail.com</p>
                    </div>
                    <Separator className="my-3" />
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <p className="text-xs text-foreground">
                        OptiFlow est conforme au Règlement Général sur la Protection des Données (RGPD) 
                        et à la loi Informatique et Libertés.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Legal Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Propriété intellectuelle
                </h2>
                <p className="text-muted-foreground mb-4">
                  L'ensemble du contenu du site OptiFlow (textes, graphiques, images, logos, icônes, sons, logiciels, 
                  etc.) est la propriété exclusive de SAS OptiFleet ou de ses partenaires et est protégé par les lois 
                  françaises et internationales relatives à la propriété intellectuelle.
                </p>
                <p className="text-muted-foreground mb-6">
                  Toute reproduction, représentation, modification, publication, transmission, dénaturation, totale 
                  ou partielle du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support 
                  que ce soit est interdite sans l'autorisation écrite préalable de SAS OptiFleet.
                </p>

                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Limitation de responsabilité
                </h2>
                <p className="text-muted-foreground mb-4">
                  SAS OptiFleet s'efforce d'assurer au mieux de ses possibilités, l'exactitude et la mise à jour 
                  des informations diffusées sur ce site. Toutefois, SAS OptiFleet ne peut garantir l'exactitude, 
                  la précision ou l'exhaustivité des informations mises à disposition sur ce site.
                </p>
                <p className="text-muted-foreground mb-6">
                  En conséquence, SAS OptiFleet décline toute responsabilité pour les éventuelles imprécisions, 
                  inexactitudes ou omissions portant sur des informations disponibles sur ce site.
                </p>

                <h2 className="text-xl font-bold text-foreground mb-4">Liens hypertextes</h2>
                <p className="text-muted-foreground mb-4">
                  Le site OptiFlow peut contenir des liens hypertextes vers d'autres sites. SAS OptiFleet n'exerce 
                  aucun contrôle sur ces sites et n'assume aucune responsabilité quant à leur contenu.
                </p>

                <h2 className="text-xl font-bold text-foreground mb-4">Droit applicable</h2>
                <p className="text-muted-foreground">
                  Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux 
                  français seront seuls compétents.
                </p>

                <p className="text-xs text-muted-foreground mt-8">
                  Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="cgv" className="mt-6">
          <div className="glass-card p-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-0">Conditions Générales de Vente et d'Utilisation</h2>
                    <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 1 - Objet</h3>
                <p className="text-muted-foreground mb-4">
                  Les présentes Conditions Générales de Vente et d'Utilisation (CGVU) régissent l'utilisation du logiciel 
                  OptiFlow, édité par SAS OptiFleet. En souscrivant à OptiFlow, l'utilisateur accepte sans réserve 
                  les présentes conditions.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 2 - Description du service</h3>
                <p className="text-muted-foreground mb-4">
                  OptiFlow est un logiciel de calcul de rentabilité et d'optimisation des coûts de transport. 
                  Il permet notamment :
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li>Le calcul des coûts de traction</li>
                  <li>L'analyse de rentabilité des trajets</li>
                  <li>La gestion des conducteurs et véhicules</li>
                  <li>La génération de rapports et exports</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 3 - Licence d'utilisation</h3>
                <p className="text-muted-foreground mb-4">
                  La licence OptiFlow est strictement personnelle et non-transférable. Elle est accordée à un seul 
                  utilisateur pour un seul poste de travail. <strong className="text-destructive">Toute utilisation 
                  de la même licence sur plusieurs postes ou par plusieurs utilisateurs entraînera la résiliation 
                  immédiate et sans préavis de l'abonnement.</strong>
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 4 - Tarifs et paiement</h3>
                <p className="text-muted-foreground mb-4">
                  Les tarifs sont indiqués en euros et hors taxes. La TVA applicable est ajoutée au moment de la facturation. 
                  Le paiement s'effectue par prélèvement automatique mensuel ou annuel selon la formule choisie.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 5 - Durée et résiliation</h3>
                <p className="text-muted-foreground mb-4">
                  L'abonnement est souscrit pour une durée minimale d'un mois. Il est renouvelé tacitement à chaque 
                  échéance. L'utilisateur peut résilier son abonnement à tout moment, la résiliation prenant effet 
                  à la fin de la période en cours.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 6 - Responsabilités</h3>
                <p className="text-muted-foreground mb-4">
                  SAS OptiFleet ne saurait être tenue responsable des décisions prises sur la base des calculs 
                  effectués par le logiciel. L'utilisateur reste seul responsable de l'utilisation des données 
                  et des résultats fournis par OptiFlow.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 7 - Propriété intellectuelle</h3>
                <p className="text-muted-foreground mb-4">
                  OptiFlow et l'ensemble de ses composants (code source, interfaces, algorithmes, documentation) 
                  sont la propriété exclusive de SAS OptiFleet. L'utilisateur s'interdit toute copie, modification, 
                  décompilation ou rétro-ingénierie du logiciel.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 8 - Support technique</h3>
                <p className="text-muted-foreground mb-4">
                  Le support technique est accessible par email à yanis.dini3121@gmail.com ou par téléphone 
                  au +33 6 46 69 14 62, du lundi au vendredi de 9h à 18h.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 9 - Droit applicable</h3>
                <p className="text-muted-foreground">
                  Les présentes CGVU sont soumises au droit français. Tout litige sera de la compétence exclusive 
                  des tribunaux de Toulouse.
                </p>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <div className="glass-card p-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-0">Politique de Confidentialité</h2>
                    <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="bg-primary/10 p-4 rounded-lg mb-6">
                  <p className="text-sm text-foreground">
                    Chez OptiFlow / SAS OptiFleet, nous accordons une importance primordiale à la protection de vos 
                    données personnelles. Cette politique de confidentialité vous informe sur la manière dont nous 
                    collectons, utilisons et protégeons vos informations.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  1. Données collectées
                </h3>
                <p className="text-muted-foreground mb-2">Nous collectons les catégories de données suivantes :</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                  <li><strong>Données professionnelles :</strong> nom de l'entreprise, SIRET, fonction</li>
                  <li><strong>Données de connexion :</strong> adresse IP, logs de connexion, données de navigation</li>
                  <li><strong>Données d'utilisation :</strong> trajets, véhicules, calculs de rentabilité</li>
                  <li><strong>Données de facturation :</strong> coordonnées bancaires (via prestataire sécurisé)</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  2. Finalités du traitement
                </h3>
                <p className="text-muted-foreground mb-2">Vos données sont traitées pour les finalités suivantes :</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li>Fourniture et gestion du service OptiFlow</li>
                  <li>Gestion de votre compte et de votre abonnement</li>
                  <li>Facturation et gestion des paiements</li>
                  <li>Support client et assistance technique</li>
                  <li>Amélioration de nos services</li>
                  <li>Communication commerciale (avec votre consentement)</li>
                  <li>Respect de nos obligations légales</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  3. Vos droits
                </h3>
                <p className="text-muted-foreground mb-2">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                  <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format lisible</li>
                  <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Pour exercer ces droits, contactez notre DPO : M. Yanis Dini à l'adresse <strong>yanis.dini3121@gmail.com</strong>
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Sécurité des données</h3>
                <p className="text-muted-foreground mb-4">
                  Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger 
                  vos données contre tout accès non autorisé, modification, divulgation ou destruction :
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                  <li>Chiffrement des données au repos</li>
                  <li>Authentification forte</li>
                  <li>Sauvegardes régulières</li>
                  <li>Accès limité aux données selon le principe du moindre privilège</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Réclamation</h3>
                <p className="text-muted-foreground">
                  Vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique 
                  et des Libertés (CNIL) si vous estimez que le traitement de vos données n'est pas conforme 
                  au RGPD : <strong>www.cnil.fr</strong>
                </p>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="cookies" className="mt-6">
          <div className="glass-card p-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Database className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-0">Politique des Cookies</h2>
                    <p className="text-sm text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Qu'est-ce qu'un cookie ?</h3>
                <p className="text-muted-foreground mb-4">
                  Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, smartphone, tablette) 
                  lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Les cookies que nous utilisons</h3>
                
                <div className="bg-muted/30 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-foreground mb-2">Cookies strictement nécessaires</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                    <li>Cookie de session (authentification)</li>
                    <li>Cookie de licence (vérification de l'abonnement)</li>
                    <li>Cookie de préférences (thème, langue)</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-foreground mb-2">Cookies de performance</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ces cookies nous permettent d'améliorer le fonctionnement du site.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                    <li>Statistiques d'utilisation anonymisées</li>
                    <li>Détection des erreurs techniques</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-foreground mb-2">Cookies fonctionnels</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ces cookies permettent de mémoriser vos préférences.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                    <li>Préférences d'affichage</li>
                    <li>Paramètres de calculateur sauvegardés</li>
                    <li>Historique de navigation dans l'application</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Durée de conservation</h3>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li><strong>Cookies de session :</strong> supprimés à la fermeture du navigateur</li>
                  <li><strong>Cookies de préférences :</strong> 1 an</li>
                  <li><strong>Cookies de licence :</strong> 30 jours</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Gestion des cookies</h3>
                <p className="text-muted-foreground mb-4">
                  Vous pouvez à tout moment modifier vos préférences en matière de cookies via les paramètres 
                  de votre navigateur :
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                  <li><strong>Chrome :</strong> Paramètres {'>'} Confidentialité et sécurité {'>'} Cookies</li>
                  <li><strong>Firefox :</strong> Options {'>'} Vie privée et sécurité {'>'} Cookies</li>
                  <li><strong>Safari :</strong> Préférences {'>'} Confidentialité</li>
                  <li><strong>Edge :</strong> Paramètres {'>'} Confidentialité {'>'} Cookies</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Attention : la désactivation de certains cookies peut affecter le fonctionnement du site.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5. Contact</h3>
                <p className="text-muted-foreground">
                  Pour toute question concernant notre politique des cookies, contactez-nous à : 
                  <strong> yanis.dini3121@gmail.com</strong>
                </p>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Foire aux Questions</h2>
                <p className="text-sm text-muted-foreground">Trouvez rapidement les réponses à vos questions</p>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="license-unique">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    Puis-je utiliser ma licence sur plusieurs appareils ?
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <p className="text-foreground font-medium mb-2">⚠️ Non, la licence OptiFlow est strictement personnelle et mono-poste.</p>
                    <p className="text-muted-foreground">
                      Chaque licence est valable pour <strong>un seul utilisateur</strong> sur <strong>un seul ordinateur</strong>. 
                      L'utilisation de la même licence sur plusieurs postes ou par plusieurs personnes est formellement interdite 
                      et entraînera la <strong>résiliation immédiate et sans préavis</strong> de votre abonnement, sans remboursement.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Si vous avez besoin de plusieurs accès, veuillez nous contacter pour obtenir des licences supplémentaires.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="change-plan">
                <AccordionTrigger>Comment changer de forfait ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    Pour changer de forfait, contactez notre équipe commerciale à yanis.dini3121@gmail.com 
                    ou au +33 6 46 69 14 62. Le changement de forfait ne nécessite pas de nouveau code licence : 
                    vos fonctionnalités seront mises à jour automatiquement.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-security">
                <AccordionTrigger>Mes données sont-elles sécurisées ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    Oui, vos données sont stockées sur des serveurs sécurisés en Union Européenne, conformément au RGPD. 
                    Nous utilisons le chiffrement des données en transit et au repos, ainsi que des sauvegardes régulières 
                    pour garantir la sécurité et la disponibilité de vos informations.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel">
                <AccordionTrigger>Comment résilier mon abonnement ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    Vous pouvez résilier votre abonnement à tout moment en nous contactant par email à yanis.dini3121@gmail.com. 
                    La résiliation prendra effet à la fin de la période de facturation en cours. 
                    Aucun remboursement ne sera effectué pour la période restante.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="support">
                <AccordionTrigger>Comment contacter le support technique ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    Notre support technique est disponible du lundi au vendredi de 9h à 18h :
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 ml-4">
                    <li>Email : yanis.dini3121@gmail.com</li>
                    <li>Téléphone : +33 6 46 69 14 62</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="export">
                <AccordionTrigger>Puis-je exporter mes données ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    Oui, selon votre forfait, vous pouvez exporter vos données au format PDF et/ou Excel. 
                    Le forfait Start permet l'export PDF basique, le forfait Pro ajoute l'export PDF professionnel 
                    et Excel, et le forfait Enterprise offre des options d'intégration avancées.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="offline">
                <AccordionTrigger>OptiFlow fonctionne-t-il hors ligne ?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    OptiFlow est une application web qui nécessite une connexion Internet pour fonctionner correctement. 
                    Cependant, certaines fonctionnalités peuvent continuer à fonctionner temporairement en mode hors ligne 
                    grâce à notre système de cache local. Les données seront synchronisées dès que la connexion sera rétablie.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>
      </Tabs>

      {/* Copyright */}
      <div className="pt-8 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Copyright className="w-4 h-4" />
          <span>SAS OptiFleet - Tous droits réservés {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
};

export default Info;
