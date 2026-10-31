import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CloudBanner } from '@/components/cloud/CloudStatus';
import { SupportButton } from '@/components/support/SupportButton';
import { useLicenseContext } from '@/context/LicenseContext';
import { useLicense } from '@/hooks/useLicense';
import { LoadingScreen } from './LoadingScreen';
import { TutorialDialog } from '../onboarding/TutorialDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider, useSidebarContext } from '@/context/SidebarContext';
import { getCategoryIdForPath } from '@/config/appNavigation';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const { collapsed } = useSidebarContext();
  const { clearLicense } = useLicense();
  const { licenseId } = useLicenseContext();
  
  // Tutorial on first session
  const [showTutorial, setShowTutorial] = useState(false);

  // Mémoïsé : passé en dépendance d'effet dans LoadingScreen. Une référence qui change à
  // chaque rendu y relancerait le minuteur de sortie (2.5s) depuis zéro à chaque re-rendu
  // de MainLayoutContent survenant avant la fin du chargement, retardant inutilement l'écran
  // d'accueil réel.
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    // Show tutorial if never seen
    const seen = localStorage.getItem('optiflow_tutorial_seen');
    if (!seen) {
      setShowTutorial(true);
      localStorage.setItem('optiflow_tutorial_seen', 'true');
    }
  }, []);

  // Permet de relancer le tutoriel à la demande (bouton dans Paramètres), sans
  // faire remonter l'état jusqu'ici via les props — même pattern que les autres
  // événements inter-composants de l'app (ex. optiflow:license-updated).
  useEffect(() => {
    const handleReplay = () => setShowTutorial(true);
    window.addEventListener('optiflow:replay-tutorial', handleReplay);
    return () => window.removeEventListener('optiflow:replay-tutorial', handleReplay);
  }, []);

  // La barre latérale n'existe que dans un espace (catégorie) sélectionné :
  // absente sur l'accueil et les pages transversales.
  const location = useLocation();
  const showSidebar = !isMobile && getCategoryIdForPath(location.pathname) !== null;

  // Calculate margin based on sidebar state
  const getMainMargin = () => {
    if (!showSidebar) return 'ml-0';
    return collapsed ? 'ml-20' : 'ml-64';
  };

  // La TopBar (fixed) doit utiliser exactement la même logique que la marge du
  // contenu ci-dessus : sinon elle se désynchronise de la Sidebar (gap ou
  // chevauchement) dès qu'elle est absente, repliée ou dépliée.
  const getTopBarLeft = () => {
    if (!showSidebar) return 'left-0';
    return collapsed ? 'left-20' : 'left-64';
  };

  return (
    <>
      {/* Loading overlay - always render layout underneath to keep hooks stable */}
      {isLoading && (
        <LoadingScreen onComplete={handleLoadingComplete} minDuration={1400} />
      )}

      <div className="min-h-screen bg-background">
        {/* Hide sidebar on mobile and outside category workspaces */}
        {showSidebar && <Sidebar />}
        <TopBar leftOffsetClass={getTopBarLeft()} />
        <main className={`pt-14 transition-all duration-300 ${getMainMargin()}`}>
          <CloudBanner onReconnect={clearLicense} />
          {/* Pas de volet d'onglets (accueil, pages transversales) : le support reste en bas à gauche. */}
          {!showSidebar && <SupportButton licenseId={licenseId} app="optiflow" floating />}
          <div className={`${isMobile ? 'p-4' : 'p-6 lg:p-8'}`}>
            {children}
          </div>
        </main>
      </div>

      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
    </>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
