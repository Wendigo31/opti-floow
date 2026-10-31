import { useEffect, useCallback, useMemo, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { LicenseProvider, useLicenseContext } from "./context/LicenseContext";
import { installCloudStatus } from "@/lib/cloudStatus";
import { bindLocalDataToCompany } from "@/lib/localDataScope";
import { CloudPresenceProvider } from "@/hooks/useCloudPresence";
import { supabase } from "@/integrations/supabase/client";
import { CloudDataProvider } from "./context/CloudDataContext";
import { MainLayout } from "./components/layout/MainLayout";
import { CompanyAccessGuard } from "./components/CompanyAccessGuard";

import { DataSyncProvider } from "./components/DataSyncProvider";
import { CloudSessionProvider } from "./components/CloudSessionProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PlanningImportProvider } from "./context/PlanningImportContext";
import { BackgroundImportIndicator } from "./components/planning/BackgroundImportIndicator";
import { useLicense } from "./hooks/useLicense";
import { useSchemaSync } from "./hooks/useSchemaSync";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { useDataPrefetch } from "./hooks/useDataPrefetch";
import { LogoLoader } from '@/components/LogoLoader';

// Lazy-loaded routes for code-splitting (reduces main bundle size)
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
const Tenders = lazy(() => import("./pages/Tenders"));
const Settings = lazy(() => import("./pages/Settings"));
const MyRestrictions = lazy(() => import("./pages/MyRestrictions"));
const Team = lazy(() => import("./pages/Team"));
const Install = lazy(() => import("./pages/Install"));
const Planning = lazy(() => import("./pages/Planning"));
const Presentation = lazy(() => import("./pages/Presentation"));
const PricingExport = lazy(() => import("./pages/PricingExport"));
const CategoryWorkspace = lazy(() => import("./pages/CategoryWorkspace"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const AcceptQuote = lazy(() => import("./pages/AcceptQuote"));
const queryClient = new QueryClient();
// Indicateur du cloud, hors ligne et session : identiques dans les 3 logiciels.
installCloudStatus(queryClient, supabase);

/** Collègues connectés en ce moment (présence du cloud de la société). */
function FlowPresence({ children }: { children: ReactNode }) {
  const { licenseId, userRole } = useLicenseContext();
  const { licenseData } = useLicense();
  const email = licenseData?.email ?? '';
  const name =
    [licenseData?.firstName, licenseData?.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'Utilisateur';
  const role = userRole ?? licenseData?.userRole ?? 'exploitation';
  // Données de l'appareil d'une autre société (ancien compte) : effacées.
  useEffect(() => {
    bindLocalDataToCompany(licenseId);
  }, [licenseId]);
  const me = useMemo(
    () => (licenseId && email ? { licenseId, email, name, role } : null),
    [licenseId, email, name, role],
  );
  return <CloudPresenceProvider me={me}>{children}</CloudPresenceProvider>;
}

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
    <LogoLoader app="flow" label="Vérification de la licence…" />
  );
}

// Fallback shown while a lazy route chunk is loading
function RouteSuspenseFallback() {
  return (
    <LogoLoader app="flow" variant="inline" label={null} />
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
              <CompanyAccessGuard>
              <FlowPresence>
              <MainLayout>
                <Suspense fallback={<RouteSuspenseFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/espace/:categoryId" element={<CategoryWorkspace />} />
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
                  <Route path="/tenders" element={<Tenders />} />
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
              </FlowPresence>
              </CompanyAccessGuard>
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
    <Suspense fallback={<RouteSuspenseFallback />}>
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
  // Route d'activation d'invitation : accessible avant toute licence (la
  // personne invitée n'en a jamais saisi une elle-même), donc en dehors du
  // garde isLicensed ci-dessous, comme /admin et /presentation.
  const isAcceptInviteRoute = location.pathname === '/accept-invite';
  // Lien public d'acceptation de devis (client, sans compte) : même tier
  // que /accept-invite, en dehors du garde isLicensed ci-dessous.
  const isAcceptQuoteRoute = location.pathname === '/accepter-devis';

  return (
    <AppProvider>
      {isAdminRoute ? (
        <AdminContent />
      ) : isPresentationRoute ? (
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Presentation />
        </Suspense>
      ) : isAcceptInviteRoute ? (
        <Suspense fallback={<RouteSuspenseFallback />}>
          <AcceptInvite />
        </Suspense>
      ) : isAcceptQuoteRoute ? (
        <Suspense fallback={<RouteSuspenseFallback />}>
          <AcceptQuote />
        </Suspense>
      ) : isLoading ? (
        <LoadingScreen />
      ) : !isLicensed ? (
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Activation />
        </Suspense>
      ) : (
        <LicensedAppContent />
      )}
    </AppProvider>
  );
}

function AppContent() {
  // Detect presentation/accept-invite/accepter-devis routes from actual browser
  // URL for MemoryRouter. accept-invite et accepter-devis gardent aussi la query
  // string (?lc=... / ?token=...), lue par useSearchParams() dans leurs pages
  // respectives.
  const { pathname, search } = window.location;
  const initialEntry =
    pathname === '/presentation' ? '/presentation' :
    pathname === '/accept-invite' ? `/accept-invite${search}` :
    pathname === '/accepter-devis' ? `/accepter-devis${search}` :
    '/';

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
