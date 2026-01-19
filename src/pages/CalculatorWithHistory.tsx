import { useState } from 'react';
import { Calculator as CalculatorIcon, History, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calculator from './Calculator';
import TripHistory from './TripHistory';
import { useLanguage } from '@/i18n/LanguageContext';

export default function CalculatorWithHistory() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('calculator');

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
