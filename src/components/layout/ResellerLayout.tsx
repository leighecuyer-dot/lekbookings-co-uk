import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useReseller } from "@/contexts/ResellerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  LayoutDashboard,
  Users,
  BarChart3,
  TicketCheck,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface ResellerLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const navItems = [
  { href: "/reseller", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/reseller/clients", icon: Users, label: "Clients" },
  { href: "/reseller/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/reseller/tickets", icon: TicketCheck, label: "Support" },
  { href: "/reseller/settings", icon: Settings, label: "Settings" },
];

export function ResellerLayout({ children, title, description }: ResellerLayoutProps) {
  const location = useLocation();
  const { reseller } = useReseller();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/reseller" className="flex items-center gap-2">
              {reseller?.logo_url ? (
                <img
                  src={reseller.logo_url}
                  alt={reseller.company_name}
                  className="h-8 w-auto"
                />
              ) : (
                <Building2 className="h-8 w-8 text-primary" />
              )}
              <span className="font-semibold text-lg">
                {reseller?.company_name || "Reseller Portal"}
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-secondary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} />
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/reseller/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden border-b bg-card overflow-x-auto">
        <div className="flex p-2 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
