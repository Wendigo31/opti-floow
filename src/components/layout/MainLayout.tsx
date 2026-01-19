import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LoadingScreen } from './LoadingScreen';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isLoading, setIsLoading] = useState(true);
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

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      {/* Loading overlay - always render layout underneath to keep hooks stable */}
      {isLoading && (
        <LoadingScreen onComplete={handleLoadingComplete} minDuration={2500} />
      )}
      
      <div className="min-h-screen bg-background">
        <Sidebar />
        <TopBar isDark={isDark} onToggleTheme={handleToggleTheme} />
        <main className="ml-20 lg:ml-64 pt-14 transition-all duration-300">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
