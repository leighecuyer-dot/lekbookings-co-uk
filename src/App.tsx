import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ResellerProvider } from "@/contexts/ResellerContext";
import { RouteGuard } from "@/components/routing/RouteGuard";

// Pages
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import CustomersPage from "./pages/CustomersPage";
import ServicesPage from "./pages/ServicesPage";
import StaffPage from "./pages/StaffPage";
import SettingsPage from "./pages/SettingsPage";
import InstallPage from "./pages/InstallPage";
import ImportPage from "./pages/ImportPage";
import NotFound from "./pages/NotFound";

// Reseller Pages
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ResellerClients from "./pages/reseller/ResellerClients";
import ResellerAnalytics from "./pages/reseller/ResellerAnalytics";
import ResellerTickets from "./pages/reseller/ResellerTickets";
import ResellerSettings from "./pages/reseller/ResellerSettings";
import ResellerOnboarding from "./pages/reseller/ResellerOnboarding";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<LandingPage />} />
    <Route 
      path="/auth" 
      element={
        <RouteGuard redirectAuthenticated>
          <Auth />
        </RouteGuard>
      } 
    />
    <Route path="/install" element={<InstallPage />} />
    
    {/* Onboarding (authenticated but no business) */}
    <Route 
      path="/onboarding" 
      element={
        <RouteGuard requireAuth redirectIfHasBusiness>
          <Onboarding />
        </RouteGuard>
      } 
    />
    
    {/* Protected routes (require auth + business) */}
    <Route 
      path="/dashboard" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <Dashboard />
        </RouteGuard>
      } 
    />
    <Route 
      path="/calendar" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <CalendarPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/customers" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <CustomersPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/services" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <ServicesPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/staff" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <StaffPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/import" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <ImportPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/settings" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <SettingsPage />
        </RouteGuard>
      } 
    />
    
    {/* Reseller routes */}
    <Route 
      path="/reseller/onboarding" 
      element={
        <RouteGuard requireAuth redirectIfIsReseller>
          <ResellerOnboarding />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller" 
      element={
        <RouteGuard requireAuth requireReseller>
          <ResellerDashboard />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/clients" 
      element={
        <RouteGuard requireAuth requireReseller>
          <ResellerClients />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/analytics" 
      element={
        <RouteGuard requireAuth requireReseller>
          <ResellerAnalytics />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/tickets" 
      element={
        <RouteGuard requireAuth requireReseller>
          <ResellerTickets />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/settings" 
      element={
        <RouteGuard requireAuth requireReseller>
          <ResellerSettings />
        </RouteGuard>
      } 
    />
    
    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BusinessProvider>
            <ResellerProvider>
              <AppRoutes />
            </ResellerProvider>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
