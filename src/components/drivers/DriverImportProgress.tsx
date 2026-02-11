import { Progress } from '@/components/ui/progress';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DriverImportProgressState {
  active: boolean;
  done: number;
  total: number;
  label: string;
  finished: boolean;
  error?: string;
}

interface DriverImportProgressProps {
  progress: DriverImportProgressState;
  onDismiss: () => void;
}

export function DriverImportProgress({ progress, onDismiss }: DriverImportProgressProps) {
  if (!progress.active) return null;

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-lg p-4 space-y-2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {progress.finished ? (
            progress.error ? (
              <X className="w-4 h-4 text-destructive" />
            ) : (
              <Check className="w-4 h-4 text-success" />
            )
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          <span>{progress.label}</span>
        </div>
        {progress.finished && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {progress.done} / {progress.total} conducteur(s) {progress.finished ? '✓' : '...'}
      </p>
      {progress.error && (
        <p className="text-xs text-destructive">{progress.error}</p>
      )}
    </div>
  );
}
