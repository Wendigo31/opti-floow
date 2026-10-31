import { useEffect, useState } from 'react';
import { LogoMarkAnimated } from '@/components/LogoLoader';

interface LoadingScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

/** Écran d'ouverture de l'espace connecté : le logo OptiFlow animé, puis fondu. */
export function LoadingScreen({ onComplete, minDuration = 1400 }: LoadingScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      doneTimer = setTimeout(onComplete, 450);
    }, minDuration);
    return () => {
      clearTimeout(exitTimer);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [minDuration, onComplete]);

  return (
    <div
      role="status"
      aria-label="Chargement d'OptiFlow"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className={`transition-transform duration-500 ${isExiting ? 'scale-110' : 'scale-100'}`}>
        <LogoMarkAnimated app="flow" size={112} />
      </div>
      <p className="ll-label text-sm font-medium text-muted-foreground">OptiFlow</p>
    </div>
  );
}
