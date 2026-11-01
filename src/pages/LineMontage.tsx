import { Layers, Lock } from 'lucide-react';
import { FeatureGate } from '@/components/license/FeatureGate';
import { LineMontageTab } from '@/components/ai/LineMontageTab';

export default function LineMontage() {
  return (
    <FeatureGate
      feature="ai_optimization"
      showLockedIndicator={true}
      fallback={
        <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto"><Lock className="w-6 h-6 text-muted-foreground" /></div>
          <h1 className="text-xl font-semibold">Création de ligne</h1>
          <p className="text-muted-foreground">Le montage de lignes assisté par IA n'est pas inclus dans votre forfait. Contactez OptiGroup pour l'activer.</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Création de ligne</h1>
            <p className="text-muted-foreground">Montage économique avec IA, conforme RSE</p>
          </div>
        </div>

        <LineMontageTab />
      </div>
    </FeatureGate>
  );
}
