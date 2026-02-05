import { useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { LicenseProvider } from "./context/LicenseContext";
import { MainLayout } from "./components/layout/MainLayout";
import { UpdateNotification } from "./components/layout/UpdateNotification";
import { DataSyncProvider } from "./components/DataSyncProvider";
import { CloudSessionProvider } from "./components/CloudSessionProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useLicense } from "./hooks/useLicense";
import { useSchemaSync } from "./hooks/useSchemaSync";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
// Calculator imported via CalculatorWithHistory
import CalculatorWithHistory from "./pages/CalculatorWithHistory";
import Itinerary from "./pages/Itinerary";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Charges from "./pages/Charges";
import Clients from "./pages/Clients";
// TripHistory replaced by CalculatorWithHistory
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import Activation from "./pages/Activation";
import NotFound from "./pages/NotFound";

// Pricing removed - custom pricing handled externally

import Admin from "./pages/Admin";
import AIAnalysis from "./pages/AIAnalysis";
import VehicleReports from "./pages/VehicleReports";
import Tours from "./pages/Tours";
import Settings from "./pages/Settings";
import MyRestrictions from "./pages/MyRestrictions";
import Team from "./pages/Team";
import Install from "./pages/Install";
 import Planning from "./pages/Planning";
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

// Loading screen component - extracted to avoid hook issues
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Vérification de la licence...</p>
      </div>
    </div>
  );
}

// Main app content - only rendered when licensed
function LicensedAppContent() {
  return (
    <LicenseProvider>
      <DataSyncProvider>
        <CloudSessionProvider>
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
                {/* Pricing page removed */}
                
                <Route path="/ai-analysis" element={<AIAnalysis />} />
                <Route path="/vehicle-reports" element={<VehicleReports />} />
                <Route path="/tours" element={<Tours />} />
                 <Route path="/planning" element={<Planning />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/my-restrictions" element={<MyRestrictions />} />
                <Route path="/team" element={<Team />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          </RealtimeNotificationsWrapper>
        </CloudSessionProvider>
      </DataSyncProvider>
    </LicenseProvider>
  );
}

// Admin route content
function AdminContent() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

function AppRoutes() {
  const { isLicensed, isLoading } = useLicense();
  const location = useLocation();

  // Permettre l'accès à /admin (y compris /admin/...) même sans licence
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  // Wrap everything in AppProvider to ensure stable hook tree
  return (
    <AppProvider>
      {isAdminRoute ? (
        <AdminContent />
      ) : isLoading ? (
        <LoadingScreen />
      ) : !isLicensed ? (
        <Activation />
      ) : (
        <LicensedAppContent />
      )}
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
        <UpdateNotification />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
