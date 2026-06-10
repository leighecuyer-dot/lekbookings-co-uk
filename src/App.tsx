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
import AuthPage from "./pages/auth/AuthPage";
import PricingPage from "./pages/PricingPage";
import AcceptInvitePage from "./pages/invite/AcceptInvitePage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CalendarPage from "./pages/calendar/CalendarPage";
import KanbanPage from "./pages/calendar/KanbanPage";
import WeekPage from "./pages/calendar/WeekPage";
import WaitlistPage from "./pages/calendar/WaitlistPage";
import CustomersPage from "./pages/customers/CustomersPage";
import ServicesPage from "./pages/services/ServicesPage";
import StaffPage from "./pages/staff/StaffPage";
import SettingsPage from "./pages/settings/SettingsPage";
import InstallPage from "./pages/install/InstallPage";
import ImportPage from "./pages/import/ImportPage";
import PublicBookingPage from "./pages/booking/PublicBookingPage";
import BookingPageEditor from "./pages/booking/BookingPageEditor";
import NotFound from "./pages/NotFound";
import DiagnosticsPage from "./pages/admin/DiagnosticsPage";
import CampaignsReportPage from "./pages/reports/CampaignsReportPage";
import DnsSetupPage from "./pages/DnsSetupPage";
import MessageLogsPage from "./pages/messaging/MessageLogsPage";

// Reseller Pages
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ResellerClients from "./pages/reseller/ResellerClients";
import ResellerAnalytics from "./pages/reseller/ResellerAnalytics";
import ResellerTickets from "./pages/reseller/ResellerTickets";
import ResellerSettings from "./pages/reseller/ResellerSettings";
import ResellerOnboarding from "./pages/reseller/ResellerOnboarding";
import WelcomeSetupPage from "./pages/welcome/WelcomeSetupPage";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/install" element={<InstallPage />} />
    <Route path="/invite/accept" element={<AcceptInvitePage />} />
    <Route path="/welcome" element={
      <RouteGuard requireAuth requireBusiness>
        <WelcomeSetupPage />
      </RouteGuard>
    } />
    <Route path="/book/:slug" element={<PublicBookingPage />} />
    <Route path="/dns-setup" element={<DnsSetupPage />} />
    
    {/* Onboarding - authenticated users can always access to add more businesses */}
    <Route 
      path="/onboarding" 
      element={
        <RouteGuard requireAuth>
          <OnboardingPage />
        </RouteGuard>
      } 
    />
    
    {/* Protected routes (require auth + business) */}
    <Route 
      path="/dashboard" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <DashboardPage />
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
      path="/kanban" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <KanbanPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/week" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <WeekPage />
        </RouteGuard>
      } 
    />
    <Route 
      path="/waitlist" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <WaitlistPage />
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
      path="/booking-page" 
      element={
        <RouteGuard requireAuth requireBusiness>
          <BookingPageEditor />
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
      
      {/* Reports routes */}
      <Route 
        path="/reports/campaigns" 
        element={
          <RouteGuard requireAuth requireBusiness>
            <CampaignsReportPage />
          </RouteGuard>
        } 
      />
      <Route 
        path="/reports/messages" 
        element={
          <RouteGuard requireAuth requireBusiness>
            <MessageLogsPage />
          </RouteGuard>
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin/diagnostics" 
        element={
          <RouteGuard requireAuth requireBusiness>
            <DiagnosticsPage />
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
        <RouteGuard requireAuth requireReseller requireResellerOnboarded>
          <ResellerDashboard />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/clients" 
      element={
        <RouteGuard requireAuth requireReseller requireResellerOnboarded>
          <ResellerClients />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/analytics" 
      element={
        <RouteGuard requireAuth requireReseller requireResellerOnboarded>
          <ResellerAnalytics />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/tickets" 
      element={
        <RouteGuard requireAuth requireReseller requireResellerOnboarded>
          <ResellerTickets />
        </RouteGuard>
      } 
    />
    <Route 
      path="/reseller/settings" 
      element={
        <RouteGuard requireAuth requireReseller requireResellerOnboarded>
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
