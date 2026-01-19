import { useEffect, useState } from 'react';
import optiflowLogo from '@/assets/optiflow-logo.svg';

interface LoadingScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function LoadingScreen({ onComplete, minDuration = 2000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    
    // Animate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, minDuration / 50);

    // Start exit animation after min duration
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, [minDuration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo container */}
      <div className={`relative z-10 transition-transform duration-500 ${isExiting ? 'scale-150 opacity-0' : 'scale-100'}`}>
        {/* Pulsing ring */}
        <div className="absolute inset-0 -m-8 rounded-full border-2 border-primary/30 animate-ping" />
        <div className="absolute inset-0 -m-4 rounded-full border border-primary/50 animate-pulse" />
        
        {/* Logo */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <img
            src={optiflowLogo}
            alt="OptiFlow"
            className="w-24 h-24 object-contain animate-scale-in"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mt-12 w-64">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-100 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Chargement...
        </p>
      </div>

      {/* Tagline */}
      <p className="relative z-10 mt-8 text-lg font-medium text-foreground/80 animate-fade-in" style={{ animationDelay: '500ms' }}>
        Optimisez votre flotte poids lourds
      </p>
    </div>
  );
}
