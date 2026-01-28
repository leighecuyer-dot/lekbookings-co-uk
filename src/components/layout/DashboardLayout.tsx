import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
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

export function DashboardLayout({ children, title, description, actions }: DashboardLayoutProps) {
  const { isResellerMode } = useBusiness();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {isResellerMode && <ResellerModeBanner />}
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            {title && (
              <div className="flex-1">
                <h1 className="text-xl font-display font-semibold">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
