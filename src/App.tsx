import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BusinessProvider, useBusiness } from "@/contexts/BusinessContext";

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

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { businesses, loading: businessLoading } = useBusiness();

  if (loading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if user has no businesses
  if (businesses.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Auth-only route (allows access even if user has no businesses)
function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { businesses, loading: businessLoading } = useBusiness();

  if (loading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user already has a business, onboarding is no longer needed
  if (businesses.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Redirect authenticated users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { businesses, loading: businessLoading } = useBusiness();

  if (loading || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={businesses.length === 0 ? "/onboarding" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/install" element={<InstallPage />} />
    
    {/* Onboarding (authenticated but no business) */}
    <Route path="/onboarding" element={<AuthOnlyRoute><Onboarding /></AuthOnlyRoute>} />
    
    {/* Protected routes */}
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
    <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
    <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
    <Route path="/staff" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
    <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    
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
            <AppRoutes />
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
