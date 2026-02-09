import { usePlanningImport } from '@/context/PlanningImportContext';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check } from 'lucide-react';

export function BackgroundImportIndicator() {
  const { progress } = usePlanningImport();

  if (!progress.active) return null;

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const isDone = progress.done >= progress.total && progress.total > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-lg p-4 space-y-2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {isDone ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
        <span>{isDone ? 'Import terminé !' : progress.label}</span>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {progress.done} / {progress.total} missions {isDone ? '✓' : '...'}
      </p>
    </div>
  );
}
