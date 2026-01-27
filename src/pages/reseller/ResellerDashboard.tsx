import { useEffect, useState } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Ticket, Building2 } from "lucide-react";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  openTickets: number;
}

export default function ResellerDashboard() {
  const { reseller, clients } = useReseller();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    openTickets: 0,
  });

  useEffect(() => {
    if (!reseller) return;

    const fetchStats = async () => {
      // Get open tickets count
      const { count: ticketCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("reseller_id", reseller.id)
        .in("status", ["open", "in_progress"]);

      const activeClients = clients.filter((c) => c.is_active);
      const monthlyRevenue = activeClients.reduce(
        (sum, c) => sum + c.monthly_price,
        0
      );

      setStats({
        totalClients: clients.length,
        activeClients: activeClients.length,
        monthlyRevenue,
        openTickets: ticketCount || 0,
      });
    };

    fetchStats();
  }, [reseller, clients]);

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Building2,
      description: "Businesses using your platform",
    },
    {
      title: "Active Clients",
      value: stats.activeClients,
      icon: Users,
      description: "Currently subscribed",
    },
    {
      title: "Monthly Revenue",
      value: `£${(stats.monthlyRevenue / 100).toFixed(2)}`,
      icon: TrendingUp,
      description: "Recurring revenue",
    },
    {
      title: "Open Tickets",
      value: stats.openTickets,
      icon: Ticket,
      description: "Awaiting response",
    },
  ];

  return (
    <ResellerLayout
      title="Dashboard"
      description={`Welcome back, ${reseller?.company_name}`}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Clients */}
      <Card className="mt-8 border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No clients yet. Add your first client to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {clients.slice(0, 5).map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {client.business?.name || "Unknown Business"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {client.business?.industry || "No industry"} •{" "}
                      {client.subscription_tier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      £{(client.monthly_price / 100).toFixed(2)}/mo
                    </p>
                    <p
                      className={`text-sm ${
                        client.is_active
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ResellerLayout>
  );
}
