import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Users, Clock, TrendingUp, Plus, ArrowRight, UserPlus, Scissors, UserCog } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { BookingEditDialog } from "@/components/booking/BookingEditDialog";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { recordDashboardRpcCall } from "@/hooks/dashboard/useDashboardDiagnostics";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import { WeeklyPerformanceTile } from "@/components/dashboard/WeeklyPerformanceTile";
import { AvailableSlotsTile } from "@/components/dashboard/AvailableSlotsTile";
import { WeeklyTrendsChart } from "@/components/dashboard/WeeklyTrendsChart";
import { RevenueGrowthTile } from "@/components/dashboard/RevenueGrowthTile";
import { BulkMessageDialog, type AvailabilityContext } from "@/components/messaging/BulkMessageDialog";
import { StaffAvailabilityWidget } from "@/components/dashboard/StaffAvailabilityWidget";
import { DashboardWidgetToggle, useDashboardWidgetSettings } from "@/components/dashboard/DashboardWidgetToggle";
import { DraggableWidgetGrid, useWidgetOrder, type WidgetId } from "@/components/dashboard/DraggableWidgetGrid";
interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  service_id: string | null;
  staff_id: string | null;
  image_urls: string[] | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Staff {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { currentBusiness, isResellerMode } = useBusiness();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekBookings: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageType, setMessageType] = useState<"sms" | "whatsapp" | "email">("sms");
  const [availabilityContext, setAvailabilityContext] = useState<AvailabilityContext | undefined>(undefined);
  const { settings: widgetSettings, updateSetting: updateWidgetSetting } = useDashboardWidgetSettings();
  const { order: widgetOrder, reorder: reorderWidgets } = useWidgetOrder();

  const handleSendSMS = () => {
    setMessageType("sms");
    setAvailabilityContext(undefined);
    setMessageDialogOpen(true);
  };

  const handleSendEmail = () => {
    setMessageType("email");
    setAvailabilityContext(undefined);
    setMessageDialogOpen(true);
  };

  const handleSendWhatsApp = () => {
    setMessageType("whatsapp");
    setAvailabilityContext(undefined);
    setMessageDialogOpen(true);
  };
  useEffect(() => {
    const fetchData = async () => {
      if (!currentBusiness) return;

      setLoading(true);

      try {
        // Use the dashboard overview RPC for stats
        const [dashboardResult, servicesResult, staffResult] = await Promise.all([
          supabase.rpc("get_dashboard_overview", {
            _business_id: currentBusiness.id,
          }),
          supabase
            .from("services")
            .select("id, name, duration_minutes")
            .eq("business_id", currentBusiness.id)
            .eq("is_active", true),
          supabase
            .from("staff")
            .select("id, name")
            .eq("business_id", currentBusiness.id)
            .eq("is_active", true),
        ]);

        if (dashboardResult.data && !dashboardResult.error) {
          // Record RPC call for diagnostics
          recordDashboardRpcCall();
          
          const data = dashboardResult.data as unknown as {
            today_bookings: number;
            week_bookings: number;
            total_customers: number;
            pending_bookings: number;
            upcoming_bookings: Booking[];
          };
          
          setStats({
            todayBookings: data.today_bookings,
            weekBookings: data.week_bookings,
            totalCustomers: data.total_customers,
            pendingBookings: data.pending_bookings,
          });
          setUpcomingBookings(data.upcoming_bookings || []);
        }

        if (servicesResult.data) setServices(servicesResult.data);
        if (staffResult.data) setStaffList(staffResult.data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentBusiness]);

  const statCards = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: Calendar,
      description: format(new Date(), "EEEE, MMMM d"),
      href: "/calendar",
    },
    {
      title: "This Week",
      value: stats.weekBookings,
      icon: TrendingUp,
      description: "Total appointments",
      href: "/calendar",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      description: "In your database",
      href: "/customers",
    },
    {
      title: "Pending Confirmation",
      value: stats.pendingBookings,
      icon: Clock,
      description: "Awaiting response",
      href: "/calendar",
    },
  ];

  const quickActions = [
    { title: "New Booking", description: "Create a new appointment", href: "/calendar", icon: Plus },
    { title: "Add Customer", description: "Register a new client", href: "/customers?action=add", icon: UserPlus },
    { title: "View Customers", description: "See all your clients", href: "/customers", icon: Users },
    { title: "Add Service", description: "Define a new service offering", href: "/services?action=add", icon: Clock },
    { title: "View Calendar", description: "See all appointments", href: "/calendar", icon: Calendar },
  ];

  const refetchData = async () => {
    if (!currentBusiness) return;
    
    const [dashboardResult, servicesResult, staffResult] = await Promise.all([
      supabase.rpc("get_dashboard_overview", {
        _business_id: currentBusiness.id,
      }),
      supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
      supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", currentBusiness.id)
        .eq("is_active", true),
    ]);

    if (dashboardResult.data) {
      // Record RPC call for diagnostics
      recordDashboardRpcCall();
      
      const result = dashboardResult.data as unknown as {
        today_bookings: number;
        week_bookings: number;
        total_customers: number;
        pending_bookings: number;
        upcoming_bookings: Booking[];
      };
      setStats({
        todayBookings: result.today_bookings,
        weekBookings: result.week_bookings,
        totalCustomers: result.total_customers,
        pendingBookings: result.pending_bookings,
      });
      setUpcomingBookings(result.upcoming_bookings || []);
    }
    
    if (servicesResult.data) setServices(servicesResult.data);
    if (staffResult.data) setStaffList(staffResult.data);
  };

  if (loading) {
    return (
      <DashboardLayout
        title={`Welcome back${currentBusiness ? `, ${currentBusiness.name}` : ""}`}
        description="Here's what's happening with your business today"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Welcome${currentBusiness ? `, ${currentBusiness.name}` : ""}`}
      description="Here's what's happening today"
      actions={
        <DashboardWidgetToggle
          settings={widgetSettings}
          onUpdateSetting={updateWidgetSetting}
        />
      }
    >
      <div className="space-y-3 sm:space-y-6 animate-fade-in h-full">
        {/* Stats Grid - Compact on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="border-0 shadow-soft bg-foreground text-background rounded-xl sm:rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4 pb-1 sm:pb-2">
                  <CardTitle className="text-[10px] sm:text-sm font-medium text-background/70 truncate">
                    {stat.title}
                  </CardTitle>
                  <div className="p-1 sm:p-2 rounded-lg bg-background/10">
                    <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-background" />
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 pt-0 sm:pt-0">
                  <div className="text-xl sm:text-3xl font-display font-bold text-background">
                    {stat.value}
                  </div>
                  <p className="text-[9px] sm:text-xs text-background/60 mt-0.5 sm:mt-1 truncate hidden sm:block">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* New Booking Button - Full Width */}
        <Link
          to="/calendar?action=add"
          className="bg-primary text-primary-foreground rounded-xl p-3 sm:p-4 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 sm:gap-3 w-full"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-sm sm:text-base font-semibold">New Booking</span>
        </Link>

        {/* Quick Add Tiles */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Link
            to="/customers?action=add"
            className="bg-foreground text-background rounded-xl p-3 sm:p-4 hover:scale-[1.02] transition-transform flex flex-col items-center justify-center gap-1 sm:gap-2 text-center"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-medium">Add Customer</span>
          </Link>
          <Link
            to="/services?action=add"
            className="bg-foreground text-background rounded-xl p-3 sm:p-4 hover:scale-[1.02] transition-transform flex flex-col items-center justify-center gap-1 sm:gap-2 text-center"
          >
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-medium">Add Service</span>
          </Link>
          <Link
            to="/staff?action=add"
            className="bg-foreground text-background rounded-xl p-3 sm:p-4 hover:scale-[1.02] transition-transform flex flex-col items-center justify-center gap-1 sm:gap-2 text-center"
          >
            <UserCog className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-medium">Add Staff</span>
          </Link>
        </div>

        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2 sm:pb-4">
            <div>
              <CardTitle className="text-sm sm:text-lg font-display">Today's Appointments</CardTitle>
              <CardDescription className="text-xs sm:text-sm hidden sm:block">Click to view or edit</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="h-7 sm:h-9 text-xs sm:text-sm">
              <Link to="/calendar">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-4 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p>No appointments today</p>
              </div>
            ) : (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                {upcomingBookings.slice(0, 3).map((booking) => {
                  const service = services.find((s) => s.id === booking.service_id);
                  return (
                    <div
                      key={booking.id}
                      onClick={() => {
                        setEditingBooking(booking);
                        setEditDialogOpen(true);
                      }}
                      className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-foreground text-background cursor-pointer hover:scale-[1.02] transition-transform min-w-[140px] sm:min-w-0 shrink-0 sm:shrink"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-background" />
                        </div>
                        <div>
                          <p className="font-semibold text-background text-sm sm:text-base">
                            {format(parseISO(booking.start_time), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium text-background truncate text-xs sm:text-base">{booking.customer_name}</p>
                      <p className="text-[10px] sm:text-sm text-background/70 truncate">{service?.name || "No service"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Availability Widget */}
        {currentBusiness && (
          <StaffAvailabilityWidget businessId={currentBusiness.id} />
        )}

        {/* Draggable Widget Grid */}
        {currentBusiness && (
          <DraggableWidgetGrid
            order={widgetOrder}
            onReorder={reorderWidgets}
            widgets={[
              {
                id: "availability" as WidgetId,
                visible: widgetSettings.showAvailabilityTile,
                render: () => (
                  <AvailableSlotsTile 
                    businessId={currentBusiness.id} 
                    businessName={currentBusiness.name}
                    onSendCampaign={(type, context) => {
                      setMessageType(type);
                      setAvailabilityContext(context);
                      setMessageDialogOpen(true);
                    }}
                  />
                ),
              },
              {
                id: "performance" as WidgetId,
                visible: widgetSettings.showPerformanceTile,
                render: () => (
                  <WeeklyPerformanceTile
                    businessId={currentBusiness.id}
                    currentWeekBookings={stats.weekBookings}
                    onSendSMS={handleSendSMS}
                    onSendEmail={handleSendEmail}
                    hideRevenue={isResellerMode && !((currentBusiness.settings as Record<string, unknown>)?.share_revenue_with_reseller === true)}
                  />
                ),
              },
              {
                id: "revenue" as WidgetId,
                visible: widgetSettings.showRevenueTile && 
                  (!isResellerMode || (currentBusiness.settings as Record<string, unknown>)?.share_revenue_with_reseller === true),
                render: () => <RevenueGrowthTile businessId={currentBusiness.id} />,
              },
              {
                id: "trends" as WidgetId,
                visible: widgetSettings.showTrendsChart,
                render: () => (
                  <WeeklyTrendsChart 
                    businessId={currentBusiness.id} 
                    currentWeekBookings={stats.weekBookings}
                    hideRevenue={isResellerMode && !((currentBusiness.settings as Record<string, unknown>)?.share_revenue_with_reseller === true)}
                  />
                ),
              },
            ]}
          />
        )}

        {/* Quick Actions + Setup Grid - Hidden on mobile */}
        <div className="hidden sm:grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="w-full justify-between h-auto py-2"
                  size="sm"
                  asChild
                >
                  <Link to={action.href}>
                    <span className="flex items-center gap-2">
                      <action.icon className="w-4 h-4 shrink-0" />
                      <span className="flex flex-col items-start">
                        <span className="font-medium">{action.title}</span>
                        <span className="text-xs text-muted-foreground font-normal">{action.description}</span>
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Getting Started Checklist */}
          <SetupChecklist 
            hasServices={services.length > 0}
            hasStaff={staffList.length > 0}
            onRefresh={refetchData}
          />
        </div>
      </div>

      <BookingEditDialog
        booking={editingBooking}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        services={services}
        staffList={staffList}
        onUpdate={refetchData}
      />

      {currentBusiness && (
        <BulkMessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          businessId={currentBusiness.id}
          businessName={currentBusiness.name}
          messageType={messageType}
          availabilityContext={availabilityContext}
        />
      )}
    </DashboardLayout>
  );
}
