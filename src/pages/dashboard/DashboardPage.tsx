import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Users, Clock, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { BookingEditDialog } from "@/components/booking/BookingEditDialog";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { recordDashboardRpcCall } from "@/hooks/dashboard/useDashboardDiagnostics";

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
  const { currentBusiness } = useBusiness();
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
    { title: "New Booking", href: "/calendar", icon: Plus },
    { title: "Add Customer", href: "/customers", icon: Users },
    { title: "View Calendar", href: "/calendar", icon: Calendar },
  ];

  const refetchData = async () => {
    if (!currentBusiness) return;
    
    const { data } = await supabase.rpc("get_dashboard_overview", {
      _business_id: currentBusiness.id,
    });

    if (data) {
      // Record RPC call for diagnostics
      recordDashboardRpcCall();
      
      const result = data as unknown as {
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
      title={`Welcome back${currentBusiness ? `, ${currentBusiness.name}` : ""}`}
      description="Here's what's happening with your business today"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="border-0 shadow-soft bg-foreground text-background rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-background/70">
                    {stat.title}
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-background/10">
                    <stat.icon className="w-4 h-4 text-background" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display font-bold text-background">
                    {stat.value}
                  </div>
                  <p className="text-xs text-background/60 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Upcoming Bookings */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display">Today's Appointments</CardTitle>
              <CardDescription>Click to view or edit</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/calendar">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="Your schedule is clear. Add a new booking to get started."
                action={{
                  label: "Add Booking",
                  href: "/calendar",
                }}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcomingBookings.map((booking) => {
                  const service = services.find((s) => s.id === booking.service_id);
                  return (
                    <div
                      key={booking.id}
                      onClick={() => {
                        setEditingBooking(booking);
                        setEditDialogOpen(true);
                      }}
                      className="p-4 rounded-2xl bg-foreground text-background cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-background" />
                        </div>
                        <div>
                          <p className="font-semibold text-background">
                            {format(parseISO(booking.start_time), "HH:mm")}
                          </p>
                          <p className="text-xs text-background/60">
                            {format(parseISO(booking.end_time), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium text-background truncate">{booking.customer_name}</p>
                      <p className="text-sm text-background/70 truncate">{service?.name || "No service"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Getting Started */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  className="w-full justify-between h-12"
                  asChild
                >
                  <Link to={action.href}>
                    <span className="flex items-center gap-2">
                      <action.icon className="w-4 h-4" />
                      {action.title}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="border-0 shadow-soft gradient-primary text-white">
            <CardHeader>
              <CardTitle className="text-lg font-display text-white">
                Getting Started
              </CardTitle>
              <CardDescription className="text-white/80">
                Complete these steps to set up your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Add your services", href: "/services" },
                  { label: "Set up your staff", href: "/staff" },
                  { label: "Import customers", href: "/customers" },
                  { label: "Share your booking page", href: "/settings" },
                ].map((step, i) => (
                  <Link
                    key={i}
                    to={step.href}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <span className="flex-1">{step.label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </DashboardLayout>
  );
}
