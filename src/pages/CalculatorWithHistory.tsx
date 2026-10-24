import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { History, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calculator from './Calculator';
import TripHistory from './TripHistory';

export default function CalculatorWithHistory() {
  // /calculator et /history partagent ce même composant (voir App.tsx) : comme React ne
  // démonte pas un composant identique entre deux Route, l'onglet actif doit suivre la
  // route à chaque navigation, sinon arriver sur /history depuis la Sidebar affiche
  // encore "Nouveau calcul" tant qu'on ne clique pas sur l'onglet "Historique" à la main.
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === '/history' ? 'history' : 'calculator');

  useEffect(() => {
    setActiveTab(location.pathname === '/history' ? 'history' : 'calculator');
  }, [location.pathname]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="calculator" className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau calcul
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6">
          <Calculator />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TripHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
