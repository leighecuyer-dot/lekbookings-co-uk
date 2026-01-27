import { useMemo } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))"];

export default function ResellerAnalytics() {
  const { clients } = useReseller();

  const tierBreakdown = useMemo(() => {
    const tiers: Record<string, { count: number; revenue: number }> = {};
    
    clients.forEach((c) => {
      const tier = c.subscription_tier || "unknown";
      if (!tiers[tier]) {
        tiers[tier] = { count: 0, revenue: 0 };
      }
      tiers[tier].count++;
      if (c.is_active) {
        tiers[tier].revenue += c.monthly_price;
      }
    });

    return Object.entries(tiers).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      clients: data.count,
      revenue: data.revenue / 100,
    }));
  }, [clients]);

  const industryBreakdown = useMemo(() => {
    const industries: Record<string, number> = {};
    
    clients.forEach((c) => {
      const industry = c.business?.industry || "Other";
      industries[industry] = (industries[industry] || 0) + 1;
    });

    return Object.entries(industries).map(([name, value]) => ({
      name,
      value,
    }));
  }, [clients]);

  const totalRevenue = clients
    .filter((c) => c.is_active)
    .reduce((sum, c) => sum + c.monthly_price, 0);

  const activeRate = clients.length
    ? Math.round((clients.filter((c) => c.is_active).length / clients.length) * 100)
    : 0;

  return (
    <ResellerLayout
      title="Analytics"
      description="Performance metrics across your client portfolio"
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              £{(totalRevenue / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {tierBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data yet
              </p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [`£${value.toFixed(2)}`, "Revenue"]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Clients by Industry</CardTitle>
          </CardHeader>
          <CardContent>
            {industryBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data yet
              </p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {industryBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ResellerLayout>
  );
}
