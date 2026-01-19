import { useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { MainLayout } from "./components/layout/MainLayout";
import { UpdateNotification } from "./components/layout/UpdateNotification";
import { DataSyncProvider } from "./components/DataSyncProvider";
import { useLicense } from "./hooks/useLicense";
import { useSchemaSync } from "./hooks/useSchemaSync";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Calculator from "./pages/Calculator";
import CalculatorWithHistory from "./pages/CalculatorWithHistory";
import Itinerary from "./pages/Itinerary";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Charges from "./pages/Charges";
import Clients from "./pages/Clients";
import TripHistory from "./pages/TripHistory";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import Activation from "./pages/Activation";
import NotFound from "./pages/NotFound";
import Info from "./pages/Info";
import Pricing from "./pages/Pricing";

import Admin from "./pages/Admin";
import AIAnalysis from "./pages/AIAnalysis";
import VehicleReports from "./pages/VehicleReports";
import Tours from "./pages/Tours";
const queryClient = new QueryClient();

// Hook global pour le raccourci admin
function useGlobalAdminShortcut() {
  const navigate = useNavigate();
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      navigate('/admin');
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Composant wrapper pour le raccourci global et schema sync
function GlobalShortcuts({ children }: { children: React.ReactNode }) {
  useGlobalAdminShortcut();
  useSchemaSync(); // Auto-sync schema on startup
  return <>{children}</>;
}

// Composant wrapper pour les notifications temps réel
function RealtimeNotificationsWrapper({ children }: { children: React.ReactNode }) {
  useRealtimeNotifications();
  return <>{children}</>;
}

function AppRoutes() {
  const { isLicensed, isLoading } = useLicense();
  const location = useLocation();

  // Permettre l'accès à /admin (y compris /admin/...) même sans licence
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  if (isLoading && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification de la licence...</p>
        </div>
      </div>
    );
  }

  // Si on va vers /admin, on affiche directement la page admin sans MainLayout mais avec AppProvider
  if (isAdminRoute) {
    return (
      <AppProvider>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AppProvider>
    );
  }

  if (!isLicensed) {
    return (
      <AppProvider>
        <Activation />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <DataSyncProvider>
        <RealtimeNotificationsWrapper>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/calculator" element={<CalculatorWithHistory />} />
              <Route path="/itinerary" element={<Itinerary />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/history" element={<CalculatorWithHistory />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/charges" element={<Charges />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/info" element={<Info />} />
              <Route path="/ai-analysis" element={<AIAnalysis />} />
              <Route path="/vehicle-reports" element={<VehicleReports />} />
              <Route path="/tours" element={<Tours />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </RealtimeNotificationsWrapper>
      </DataSyncProvider>
    </AppProvider>
  );
}

function AppContent() {
  return (
    <MemoryRouter>
      <GlobalShortcuts>
        <AppRoutes />
      </GlobalShortcuts>
    </MemoryRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
        <UpdateNotification />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
