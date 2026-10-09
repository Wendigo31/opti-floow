import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
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
  
  // null = auto (système), true = dark, false = light
  const [isDark, setIsDark] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      // Auto mode by default
      return null;
    }
    return null;
  });

  // Apply theme based on state
  useEffect(() => {
    const applyTheme = (prefersDark: boolean) => {
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (isDark === null) {
      // Auto mode - follow system
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      localStorage.setItem('theme', 'auto');

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    // Cycle: auto -> light -> dark -> auto
    if (isDark === null) {
      setIsDark(false); // light
    } else if (isDark === false) {
      setIsDark(true); // dark
    } else {
      setIsDark(null); // auto
    }
  };

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
        <LoadingScreen onComplete={handleLoadingComplete} minDuration={2500} />
      )}

      <div className="min-h-screen bg-background">
        {/* Hide sidebar on mobile and outside category workspaces */}
        {showSidebar && <Sidebar />}
        <TopBar isDark={isDark} onToggleTheme={handleToggleTheme} leftOffsetClass={getTopBarLeft()} />
        <main className={`pt-14 transition-all duration-300 ${getMainMargin()}`}>
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
