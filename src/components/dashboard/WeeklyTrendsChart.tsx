import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, format, parseISO } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeeklyTrendsChartProps {
  businessId: string;
  currentWeekBookings: number;
}

interface WeekData {
  week: string;
  weekLabel: string;
  bookings: number;
  revenue: number;
  isCurrent: boolean;
}

type MetricType = "bookings" | "revenue";

export function WeeklyTrendsChart({ businessId, currentWeekBookings }: WeeklyTrendsChartProps) {
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("bookings");

  useEffect(() => {
    const fetchTrends = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const eightWeeksAgo = subWeeks(currentWeekStart, 7);
        
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("start_time, total_price")
          .eq("business_id", businessId)
          .gte("start_time", eightWeeksAgo.toISOString())
          .neq("status", "cancelled");
        
        if (error) throw error;
        
        // Group bookings by week
        const weeklyCountsMap = new Map<string, { count: number; revenue: number }>();
        
        // Initialize all 8 weeks with 0
        for (let i = 7; i >= 0; i--) {
          const weekStart = subWeeks(currentWeekStart, i);
          const weekKey = format(weekStart, "yyyy-MM-dd");
          weeklyCountsMap.set(weekKey, { count: 0, revenue: 0 });
        }
        
        // Count bookings and sum revenue per week
        bookings?.forEach(booking => {
          const bookingDate = parseISO(booking.start_time);
          const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, "yyyy-MM-dd");
          
          if (weeklyCountsMap.has(weekKey)) {
            const current = weeklyCountsMap.get(weekKey)!;
            weeklyCountsMap.set(weekKey, {
              count: current.count + 1,
              revenue: current.revenue + (booking.total_price || 0),
            });
          }
        });
        
        // Convert to array for chart
        const data: WeekData[] = [];
        const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
        
        weeklyCountsMap.forEach((value, weekKey) => {
          const weekDate = parseISO(weekKey);
          const isCurrent = weekKey === currentWeekKey;
          
          data.push({
            week: weekKey,
            weekLabel: format(weekDate, "MMM d"),
            bookings: isCurrent ? currentWeekBookings : value.count,
            revenue: value.revenue,
            isCurrent,
          });
        });
        
        // Sort by date
        data.sort((a, b) => a.week.localeCompare(b.week));
        
        setWeeklyData(data);
      } catch (error) {
        console.error("Error fetching weekly trends:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrends();
  }, [businessId, currentWeekBookings]);

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...weeklyData.map(d => metric === "bookings" ? d.bookings : d.revenue), 1);
  const avgValue = weeklyData.length > 1 
    ? weeklyData.slice(0, -1).reduce((sum, d) => sum + (metric === "bookings" ? d.bookings : d.revenue), 0) / (weeklyData.length - 1)
    : 0;

  const formatValue = (value: number) => {
    if (metric === "revenue") {
      return `£${value.toFixed(0)}`;
    }
    return value.toString();
  };

  const formatAvg = (value: number) => {
    if (metric === "revenue") {
      return `£${value.toFixed(0)}`;
    }
    return value.toFixed(1);
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            8-Week Trends
          </span>
          <div className="flex items-center gap-3">
            <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
              <TabsList className="h-7">
                <TabsTrigger value="bookings" className="text-xs px-2 py-1 h-5">
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="revenue" className="text-xs px-2 py-1 h-5">
                  Revenue
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Avg: {formatAvg(avgValue)}{metric === "bookings" ? "/week" : "/week"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: metric === "revenue" ? 0 : -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="weekLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={metric === "revenue" ? 45 : 30}
                domain={[0, Math.ceil(maxValue * 1.1)]}
                tickFormatter={(value) => metric === "revenue" ? `£${value}` : value}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as WeekData;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          Week of {data.weekLabel}
                          {data.isCurrent && " (Current)"}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {metric === "bookings" 
                            ? `${data.bookings} bookings`
                            : `£${data.revenue.toFixed(2)}`
                          }
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={metric === "bookings" ? "hsl(var(--primary))" : "hsl(var(--chart-2))"}
                strokeWidth={2}
                fill={metric === "bookings" ? "url(#bookingsGradient)" : "url(#revenueGradient)"}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const color = metric === "bookings" ? "hsl(var(--primary))" : "hsl(var(--chart-2))";
                  if (payload.isCurrent) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={color}
                      fillOpacity={0.5}
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: metric === "bookings" ? "hsl(var(--primary))" : "hsl(var(--chart-2))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
