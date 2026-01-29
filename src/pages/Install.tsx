import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, MoreVertical, Plus } from 'lucide-react';
import optiflowLogo from '@/assets/optiflow-logo.svg';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <img src={optiflowLogo} alt="OptiFlow" className="w-20 h-20" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2 text-success">
              <Check className="w-6 h-6" />
              Application installée
            </CardTitle>
            <CardDescription>
              OptiFlow est maintenant disponible sur votre écran d'accueil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vous pouvez fermer cette fenêtre et ouvrir l'application depuis votre écran d'accueil.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={optiflowLogo} alt="OptiFlow" className="w-20 h-20" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Installer OptiFlow
          </CardTitle>
          <CardDescription>
            Installez l'application sur votre appareil pour un accès rapide et hors-ligne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avantages */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Accès rapide</p>
                <p className="text-xs text-muted-foreground">Lancez l'app depuis votre écran d'accueil</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Mode hors-ligne</p>
                <p className="text-xs text-muted-foreground">Accédez à vos données sans connexion</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Expérience native</p>
                <p className="text-xs text-muted-foreground">Interface plein écran comme une app native</p>
              </div>
            </div>
          </div>

          {/* Installation button or instructions */}
          {deferredPrompt ? (
            <Button 
              onClick={handleInstallClick} 
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Installer maintenant
            </Button>
          ) : isIOS ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm text-center">Installation sur iOS</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  <span className="flex items-center gap-1">
                    Appuyez sur <Share className="w-4 h-4" /> en bas de Safari
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  <span className="flex items-center gap-1">
                    Faites défiler et appuyez sur <Plus className="w-4 h-4" /> "Sur l'écran d'accueil"
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  <span>Appuyez sur "Ajouter"</span>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm text-center">Installation sur Android</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  <span className="flex items-center gap-1">
                    Appuyez sur <MoreVertical className="w-4 h-4" /> en haut de Chrome
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  <span>Sélectionnez "Ajouter à l'écran d'accueil"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  <span>Confirmez l'installation</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ouvrez cette page sur votre téléphone pour installer l'application
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
