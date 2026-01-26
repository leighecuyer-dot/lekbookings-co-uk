import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Users, Clock, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

interface Stats {
  todayBookings: number;
  weekBookings: number;
  totalCustomers: number;
  pendingBookings: number;
}

export default function Dashboard() {
  const { currentBusiness } = useBusiness();
  const [stats, setStats] = useState<Stats>({
    todayBookings: 0,
    weekBookings: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentBusiness) return;

      setLoading(true);
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const weekEnd = endOfWeek(now).toISOString();

      const [todayResult, weekResult, customersResult, pendingResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", currentBusiness.id)
          .gte("start_time", todayStart)
          .lte("start_time", todayEnd),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", currentBusiness.id)
          .gte("start_time", weekStart)
          .lte("start_time", weekEnd),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", currentBusiness.id),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", currentBusiness.id)
          .eq("status", "pending"),
      ]);

      setStats({
        todayBookings: todayResult.count || 0,
        weekBookings: weekResult.count || 0,
        totalCustomers: customersResult.count || 0,
        pendingBookings: pendingResult.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [currentBusiness]);

  const statCards = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings,
      icon: Calendar,
      description: format(new Date(), "EEEE, MMMM d"),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "This Week",
      value: stats.weekBookings,
      icon: TrendingUp,
      description: "Total appointments",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      description: "In your database",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pending Confirmation",
      value: stats.pendingBookings,
      icon: Clock,
      description: "Awaiting response",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const quickActions = [
    { title: "New Booking", href: "/calendar", icon: Plus },
    { title: "Add Customer", href: "/customers", icon: Users },
    { title: "View Calendar", href: "/calendar", icon: Calendar },
  ];

  return (
    <DashboardLayout
      title={`Welcome back${currentBusiness ? `, ${currentBusiness.name}` : ""}`}
      description="Here's what's happening with your business today"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold">
                  {loading ? "-" : stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Recent Activity */}
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
    </DashboardLayout>
  );
}
