import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, ChevronLeft } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
}

function ResellerModeBanner() {
  const navigate = useNavigate();
  const { currentBusiness, exitResellerMode } = useBusiness();

  const handleExit = () => {
    exitResellerMode();
    navigate("/reseller/clients");
  };

  return (
    <div className="bg-accent/50 border-b border-accent px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-accent-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">
          Managing <strong>{currentBusiness?.name}</strong> (Reseller Mode)
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleExit}
        className="text-accent-foreground hover:bg-accent gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Exit Client
      </Button>
    </div>
  );
}

export function DashboardLayout({ children, title, description, actions, showBackButton = true }: DashboardLayoutProps) {
  const { isResellerMode } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If there's history, go back; otherwise go to dashboard
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const isDashboard = location.pathname === "/dashboard";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {isResellerMode && <ResellerModeBanner />}
          <header className="sticky top-0 z-10 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-6 shrink-0">
            <SidebarTrigger className="-ml-1 sm:-ml-2" />
            {showBackButton && !isDashboard && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-display font-semibold truncate">{title}</h1>
                {description && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{description}</p>
                )}
              </div>
            )}
            {actions && <div className="flex items-center gap-1 sm:gap-2 shrink-0">{actions}</div>}
          </header>
          <main className="flex-1 p-3 sm:p-6 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
