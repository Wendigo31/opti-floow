import { useEffect, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { LicenseProvider } from "./context/LicenseContext";
import { CloudDataProvider } from "./context/CloudDataContext";
import { MainLayout } from "./components/layout/MainLayout";

import { DataSyncProvider } from "./components/DataSyncProvider";
import { CloudSessionProvider } from "./components/CloudSessionProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PlanningImportProvider } from "./context/PlanningImportContext";
import { BackgroundImportIndicator } from "./components/planning/BackgroundImportIndicator";
import { useLicense } from "./hooks/useLicense";
import { useSchemaSync } from "./hooks/useSchemaSync";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { useDataPrefetch } from "./hooks/useDataPrefetch";
import { Loader2 } from "lucide-react";
// Code-splitting: each route is loaded on demand to shrink the main bundle.
const Index = lazy(() => import("./pages/Index"));
const CalculatorWithHistory = lazy(() => import("./pages/CalculatorWithHistory"));
const Itinerary = lazy(() => import("./pages/Itinerary"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Charges = lazy(() => import("./pages/Charges"));
const Clients = lazy(() => import("./pages/Clients"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Forecast = lazy(() => import("./pages/Forecast"));
const Activation = lazy(() => import("./pages/Activation"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const AIAnalysis = lazy(() => import("./pages/AIAnalysis"));
const LineMontage = lazy(() => import("./pages/LineMontage"));
const VehicleReports = lazy(() => import("./pages/VehicleReports"));
const Tours = lazy(() => import("./pages/Tours"));
const Settings = lazy(() => import("./pages/Settings"));
const MyRestrictions = lazy(() => import("./pages/MyRestrictions"));
const Team = lazy(() => import("./pages/Team"));
const Install = lazy(() => import("./pages/Install"));
const Planning = lazy(() => import("./pages/Planning"));
const Presentation = lazy(() => import("./pages/Presentation"));
const PricingExport = lazy(() => import("./pages/PricingExport"));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
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
  useDataPrefetch(); // Prefetch all data in parallel on startup
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
      <CloudDataProvider>
        <DataSyncProvider>
          <CloudSessionProvider>
            <RealtimeNotificationsWrapper>
              <MainLayout>
                <Suspense fallback={<RouteFallback />}>
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
                  <Route path="/line-montage" element={<LineMontage />} />
                  <Route path="/vehicle-reports" element={<VehicleReports />} />
                  <Route path="/tours" element={<Tours />} />
                  <Route path="/planning" element={<Planning />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/my-restrictions" element={<MyRestrictions />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/pricing-export" element={<PricingExport />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </MainLayout>
            </RealtimeNotificationsWrapper>
          </CloudSessionProvider>
        </DataSyncProvider>
      </CloudDataProvider>
    </LicenseProvider>
  );
}

// Admin route content
function AdminContent() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Suspense>
  );
}

function AppRoutes() {
  const { isLicensed, isLoading } = useLicense();
  const location = useLocation();

  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isPresentationRoute = location.pathname === '/presentation';

  return (
    <AppProvider>
      {isAdminRoute ? (
        <AdminContent />
      ) : isPresentationRoute ? (
        <Suspense fallback={<RouteFallback />}>
          <Presentation />
        </Suspense>
      ) : isLoading ? (
        <LoadingScreen />
      ) : !isLicensed ? (
        <Suspense fallback={<RouteFallback />}>
          <Activation />
        </Suspense>
      ) : (
        <LicensedAppContent />
      )}
    </AppProvider>
  );
}

function AppContent() {
  // Detect presentation route from actual browser URL for MemoryRouter
  const initialEntry = window.location.pathname === '/presentation' ? '/presentation' : '/';
  
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
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
        <PlanningImportProvider>
          <Toaster />
          <Sonner />
          <AppContent />
          <BackgroundImportIndicator />
        </PlanningImportProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
