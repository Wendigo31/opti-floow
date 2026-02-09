import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ImportProgress {
  active: boolean;
  total: number;
  done: number;
  label: string;
}

interface PlanningImportContextType {
  progress: ImportProgress;
  startBackgroundImport: (params: {
    importFn: (onProgress: (done: number, total: number) => void) => Promise<boolean>;
    total: number;
    label: string;
    onComplete?: (success: boolean) => void;
  }) => void;
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
  });
  const runningRef = useRef(false);

  const startBackgroundImport = useCallback(
    ({ importFn, total, label, onComplete }: Parameters<PlanningImportContextType['startBackgroundImport']>[0]) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setProgress({ active: true, total, done: 0, label });

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
          // Keep the "done" state visible for a moment
          setProgress((p) => ({ ...p, done: p.total }));
          setTimeout(() => {
            setProgress({ active: false, total: 0, done: 0, label: '' });
            runningRef.current = false;
          }, 2000);
        });
    },
    []
  );

  return (
    <PlanningImportContext.Provider value={{ progress, startBackgroundImport }}>
      {children}
    </PlanningImportContext.Provider>
  );
}
