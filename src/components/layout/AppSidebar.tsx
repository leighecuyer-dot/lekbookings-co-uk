import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Calendar,
  Users,
  UserCircle,
  Settings,
  Briefcase,
  LayoutDashboard,
  LogOut,
  ChevronUp,
  Building2,
  Upload,
  Columns3,
  CalendarDays,
  ExternalLink,
  Plus,
  UserPlus,
  UserCog,
  BarChart3,
  ClipboardList,
  Share2,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const mainNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Week View", href: "/week", icon: CalendarDays },
  { title: "Kanban Board", href: "/kanban", icon: Columns3 },
  { title: "Waitlist", href: "/waitlist", icon: ClipboardList },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Staff", href: "/staff", icon: UserCircle },
  { title: "Services", href: "/services", icon: Briefcase },
  { title: "Import", href: "/import", icon: Upload },
];

const reportNavItems = [
  { title: "Campaign Reports", href: "/reports/campaigns", icon: BarChart3 },
  { title: "Message History", href: "/reports/messages", icon: MessageSquare },
];

const integrationNavItems = [
  { title: "Social Media", icon: Share2, comingSoon: true },
];


export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentBusiness, businesses, setCurrentBusiness } = useBusiness();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-display font-bold text-sidebar-foreground">
            LEK
          </span>
        </div>
        
        {/* Business Selector */}
        {currentBusiness && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start mt-4 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span className="truncate">{currentBusiness.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {businesses.map((business) => (
                <DropdownMenuItem
                  key={business.id}
                  onClick={() => setCurrentBusiness(business)}
                  className={business.id === currentBusiness.id ? "bg-accent" : ""}
                >
                  {business.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/onboarding" className="text-primary cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Business
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="grid grid-cols-3 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 h-10 md:h-11 text-xs gap-1 px-2"
                    asChild
                  >
                    <Link to="/customers?action=add">
                      <UserPlus className="w-4 h-4" />
                      Customer
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add a new customer</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 h-10 md:h-11 text-xs gap-1 px-2"
                    asChild
                  >
                    <Link to="/services?action=add">
                      <Plus className="w-4 h-4" />
                      Service
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add a new service</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 h-10 md:h-11 text-xs gap-1 px-2"
                    asChild
                  >
                    <Link to="/staff?action=add">
                      <UserCog className="w-4 h-4" />
                      Staff
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add a new staff member</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Reports
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Integrations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton className="cursor-default opacity-60">
                        <item.icon className="w-4 h-4" />
                        <span className="flex items-center gap-2">
                          {item.title}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Coming Soon
                          </Badge>
                        </span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Facebook & Instagram integration coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Booking Page - External Link */}
              {currentBusiness && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href={`${window.location.origin}/book/${currentBusiness.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Booking Page</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                >
                  <Link to="/settings">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Avatar className="w-8 h-8 mr-2">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                  {getInitials(user?.user_metadata?.full_name || user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
