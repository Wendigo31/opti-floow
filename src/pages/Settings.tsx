import { useState, useRef } from 'react';
import { Settings as SettingsIcon, Bell, History, Shield, User, Building2, MapPin, KeyRound, RefreshCw, Info as InfoIcon, FileText, Database, HardDrive, Scale, Lock, HelpCircle, Download, Upload, FolderOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { LicenseSyncSettings } from '@/components/settings/LicenseSyncSettings';
import { ActivityHistory } from '@/components/shared/ActivityHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLicense } from '@/hooks/useLicense';
import { useApp } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { exportAllData, importAllData } from '@/utils/dataExport';
import { saveFileWithPicker } from '@/utils/fileSave';
import { ContactDialog } from '@/components/ContactDialog';
import { AlertCircle, Mail, Phone, UserCheck } from 'lucide-react';

// Version basée sur l'historique des modifications du projet
const BASE_VERSION = '1.24.0';
const getAppVersion = () => {
  const storedVersion = localStorage.getItem('optiflow_current_version');
  return storedVersion ? `v${storedVersion}` : `v${BASE_VERSION}`;
};

export default function Settings() {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground">Gérez votre compte, licence et préférences</p>
          </div>
        </div>
        <ContactDialog 
          userEmail={licenseData?.email}
          userName={`${licenseData?.firstName || ''} ${licenseData?.lastName || ''}`.trim()}
          companyName={licenseData?.companyName}
          licenseCode={licenseData?.code}
        />
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="account" className="gap-2">
            <User className="w-4 h-4" />
            Mon compte
          </TabsTrigger>
          <TabsTrigger value="license" className="gap-2">
            <Shield className="w-4 h-4" />
            Licence
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="w-4 h-4" />
            Données
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="w-4 h-4" />
            Activité
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="w-4 h-4" />
            Légal
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        {/* Mon compte */}
        <TabsContent value="account" className="space-y-6">
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

        {/* Licence & Features */}
        <TabsContent value="license" className="space-y-6">
          <LicenseSyncSettings />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {/* Données */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Export/Import */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <CardTitle>Profil (configuration)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Exportez votre configuration (conducteurs, charges, véhicule) pour la sauvegarder.
                  </p>
                  <Button onClick={handleExportProfile} className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter le profil (.opp)
                  </Button>
                </div>
                
                <Separator />
                
                <div>
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

                <Separator />
                
                <div>
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
              </CardContent>
            </Card>

            {/* Data Export/Import */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Database className="w-5 h-5 text-amber-500" />
                </div>
                <CardTitle>Données (clients, trajets, devis)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Exportez vos données métier (clients, trajets, devis) au format JSON.
                  </p>
                  <Button onClick={handleExportData} className="w-full" variant="outline">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Exporter les données (.json)
                  </Button>
                </div>
                
                <Separator />
                
                <div>
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
              </CardContent>
            </Card>

            {/* Download Settings */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <HardDrive className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Téléchargements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activité équipe */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityHistory />
        </TabsContent>

        {/* Légal */}
        <TabsContent value="legal" className="space-y-6">
          <Tabs defaultValue="mentions" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="mentions">Mentions légales</TabsTrigger>
              <TabsTrigger value="cgv">CGV / CGU</TabsTrigger>
              <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
              <TabsTrigger value="cookies">Cookies</TabsTrigger>
            </TabsList>

            <TabsContent value="mentions" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
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
                        </CardContent>
                      </Card>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-primary" />
                        Propriété intellectuelle
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        L'ensemble du contenu du site OptiFlow est la propriété exclusive de SAS OptiFleet 
                        ou de ses partenaires et est protégé par les lois françaises et internationales 
                        relatives à la propriété intellectuelle.
                      </p>

                      <h2 className="text-xl font-bold text-foreground mb-4">Droit applicable</h2>
                      <p className="text-muted-foreground">
                        Les présentes mentions légales sont régies par le droit français. En cas de litige, 
                        les tribunaux français seront seuls compétents.
                      </p>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cgv" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-0">Conditions Générales</h2>
                          <p className="text-sm text-muted-foreground">Vente et Utilisation</p>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 1 - Objet</h3>
                      <p className="text-muted-foreground mb-4">
                        Les présentes CGVU régissent l'utilisation du logiciel OptiFlow, édité par SAS OptiFleet.
                      </p>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 2 - Licence</h3>
                      <p className="text-muted-foreground mb-4">
                        La licence OptiFlow est strictement personnelle et non-transférable. Toute utilisation 
                        de la même licence sur plusieurs postes entraînera la résiliation immédiate.
                      </p>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Article 3 - Support</h3>
                      <p className="text-muted-foreground">
                        Le support technique est accessible par email à yanis.dini3121@gmail.com ou par téléphone 
                        au +33 6 46 69 14 62, du lundi au vendredi de 9h à 18h.
                      </p>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-0">Politique de Confidentialité</h2>
                          <p className="text-sm text-muted-foreground">Protection de vos données</p>
                        </div>
                      </div>

                      <div className="bg-primary/10 p-4 rounded-lg mb-6">
                        <p className="text-sm text-foreground">
                          Chez OptiFlow / SAS OptiFleet, nous accordons une importance primordiale à la protection 
                          de vos données personnelles, conformément au RGPD.
                        </p>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Vos droits</h3>
                      <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                        <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
                        <li><strong>Droit à l'effacement</strong> : demander la suppression</li>
                        <li><strong>Droit à la portabilité</strong> : récupérer vos données</li>
                      </ul>

                      <p className="text-muted-foreground">
                        Contact DPO : M. Yanis Dini - yanis.dini3121@gmail.com
                      </p>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cookies" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Database className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-0">Politique des Cookies</h2>
                          <p className="text-sm text-muted-foreground">Utilisation des cookies</p>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Cookies utilisés</h3>
                      
                      <div className="bg-muted/30 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold text-foreground mb-2">Cookies strictement nécessaires</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                          <li>Cookie de session (authentification)</li>
                          <li>Cookie de licence (vérification de l'abonnement)</li>
                          <li>Cookie de préférences (thème, langue)</li>
                        </ul>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Durée de conservation</h3>
                      <ul className="list-disc list-inside text-muted-foreground mb-4 ml-4 space-y-2">
                        <li><strong>Cookies de session</strong> : supprimés à la fermeture du navigateur</li>
                        <li><strong>Cookies de préférences</strong> : 1 an</li>
                        <li><strong>Cookies de licence</strong> : 30 jours</li>
                      </ul>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Foire aux Questions</CardTitle>
                  <p className="text-sm text-muted-foreground">Trouvez rapidement les réponses à vos questions</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                        Chaque licence est valable pour un seul utilisateur sur un seul ordinateur. 
                        L'utilisation sur plusieurs postes entraînera la résiliation immédiate.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="change-plan">
                  <AccordionTrigger>Comment changer de forfait ?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Contactez notre équipe à yanis.dini3121@gmail.com ou au +33 6 46 69 14 62. 
                      Le changement ne nécessite pas de nouveau code licence.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-security">
                  <AccordionTrigger>Mes données sont-elles sécurisées ?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Oui, vos données sont stockées sur des serveurs sécurisés en Union Européenne, 
                      conformément au RGPD, avec chiffrement en transit et au repos.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cancel">
                  <AccordionTrigger>Comment résilier mon abonnement ?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Vous pouvez résilier à tout moment par email à yanis.dini3121@gmail.com. 
                      La résiliation prend effet à la fin de la période de facturation en cours.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support">
                  <AccordionTrigger>Comment contacter le support technique ?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Support disponible du lundi au vendredi de 9h à 18h :
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
                      Oui, selon votre forfait vous pouvez exporter vos données au format PDF et/ou Excel. 
                      Rendez-vous dans l'onglet "Données" de cette page.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="offline">
                  <AccordionTrigger>OptiFlow fonctionne-t-il hors ligne ?</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Les forfaits Pro et Enterprise incluent le mode hors ligne. Le forfait Start 
                      nécessite une connexion internet permanente.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Copyright */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        <p>© {new Date().getFullYear()} OptiFlow - SAS OptiFleet. Tous droits réservés.</p>
        <p className="mt-1">{getAppVersion()}</p>
      </div>
    </div>
  );
}
