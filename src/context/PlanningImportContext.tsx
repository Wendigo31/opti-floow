import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ImportProgress {
  active: boolean;
  total: number;
  done: number;
  label: string;
  /** Incremented each time an import finishes (success or fail) */
  completedAt: number;
}

interface PlanningImportContextType {
  progress: ImportProgress;
  startBackgroundImport: (params: {
    importFn: (onProgress: (done: number, total: number) => void) => Promise<boolean>;
    total: number;
    label: string;
    onComplete?: (success: boolean) => void;
  }) => void;
  dismissProgress: () => void;
}

const PlanningImportContext = createContext<PlanningImportContextType | null>(null);

export function usePlanningImport() {
  const ctx = useContext(PlanningImportContext);
  if (!ctx) throw new Error('usePlanningImport must be used within PlanningImportProvider');
  return ctx;
}

export function PlanningImportProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ImportProgress>({
    active: false,
    total: 0,
    done: 0,
    label: '',
    completedAt: 0,
  });
  const runningRef = useRef(false);

  const startBackgroundImport = useCallback(
    ({ importFn, total, label, onComplete }: Parameters<PlanningImportContextType['startBackgroundImport']>[0]) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setProgress({ active: true, total, done: 0, label, completedAt: 0 });

      // Safety timeout — auto-cleanup after 5 minutes max
      const safetyTimer = setTimeout(() => {
        console.warn('[PlanningImport] Safety timeout reached, forcing cleanup');
        setProgress({ active: false, total: 0, done: 0, label: '', completedAt: 0 });
        runningRef.current = false;
      }, 5 * 60 * 1000);

      // Run in background — not awaited
      importFn((done, tot) => {
        setProgress((p) => ({ ...p, done, total: tot }));
      })
        .then((success) => {
          onComplete?.(success);
        })
        .catch(() => {
          onComplete?.(false);
        })
        .finally(() => {
          clearTimeout(safetyTimer);
          // Keep the "done" state visible for a moment
          setProgress((p) => ({ ...p, done: p.total, completedAt: Date.now() }));
          setTimeout(() => {
            setProgress({ active: false, total: 0, done: 0, label: '', completedAt: 0 });
            runningRef.current = false;
          }, 2000);
        });
    },
    []
  );
  const dismissProgress = useCallback(() => {
    setProgress({ active: false, total: 0, done: 0, label: '', completedAt: 0 });
    runningRef.current = false;
  }, []);

  return (
    <PlanningImportContext.Provider value={{ progress, startBackgroundImport, dismissProgress }}>
      {children}
    </PlanningImportContext.Provider>
  );
}
