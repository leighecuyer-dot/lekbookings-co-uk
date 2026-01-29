import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, subDays, format, parseISO, startOfDay, isSameDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeeklyTrendsChartProps {
  businessId: string;
  currentWeekBookings: number;
}

interface DataPoint {
  key: string;
  label: string;
  bookings: number;
  revenue: number;
  isCurrent: boolean;
}

type MetricType = "bookings" | "revenue";
type ViewType = "weekly" | "daily";

export function WeeklyTrendsChart({ businessId, currentWeekBookings }: WeeklyTrendsChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("bookings");
  const [view, setView] = useState<ViewType>("weekly");

  useEffect(() => {
    const fetchTrends = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const now = new Date();
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const today = startOfDay(now);
        
        // Fetch range depends on view
        const startDate = view === "weekly" 
          ? subWeeks(currentWeekStart, 7)
          : subDays(today, 29); // Last 30 days
        
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("start_time, total_price")
          .eq("business_id", businessId)
          .gte("start_time", startDate.toISOString())
          .neq("status", "cancelled");
        
        if (error) throw error;
        
        if (view === "weekly") {
          // Group bookings by week
          const weeklyMap = new Map<string, { count: number; revenue: number }>();
          
          for (let i = 7; i >= 0; i--) {
            const weekStart = subWeeks(currentWeekStart, i);
            const weekKey = format(weekStart, "yyyy-MM-dd");
            weeklyMap.set(weekKey, { count: 0, revenue: 0 });
          }
          
          bookings?.forEach(booking => {
            const bookingDate = parseISO(booking.start_time);
            const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
            const weekKey = format(weekStart, "yyyy-MM-dd");
            
            if (weeklyMap.has(weekKey)) {
              const current = weeklyMap.get(weekKey)!;
              weeklyMap.set(weekKey, {
                count: current.count + 1,
                revenue: current.revenue + (booking.total_price || 0),
              });
            }
          });
          
          const result: DataPoint[] = [];
          const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
          
          weeklyMap.forEach((value, key) => {
            const weekDate = parseISO(key);
            const isCurrent = key === currentWeekKey;
            
            result.push({
              key,
              label: format(weekDate, "MMM d"),
              bookings: isCurrent ? currentWeekBookings : value.count,
              revenue: value.revenue,
              isCurrent,
            });
          });
          
          result.sort((a, b) => a.key.localeCompare(b.key));
          setData(result);
        } else {
          // Group bookings by day
          const dailyMap = new Map<string, { count: number; revenue: number }>();
          
          for (let i = 29; i >= 0; i--) {
            const day = subDays(today, i);
            const dayKey = format(day, "yyyy-MM-dd");
            dailyMap.set(dayKey, { count: 0, revenue: 0 });
          }
          
          bookings?.forEach(booking => {
            const bookingDate = parseISO(booking.start_time);
            const dayKey = format(startOfDay(bookingDate), "yyyy-MM-dd");
            
            if (dailyMap.has(dayKey)) {
              const current = dailyMap.get(dayKey)!;
              dailyMap.set(dayKey, {
                count: current.count + 1,
                revenue: current.revenue + (booking.total_price || 0),
              });
            }
          });
          
          const result: DataPoint[] = [];
          const todayKey = format(today, "yyyy-MM-dd");
          
          dailyMap.forEach((value, key) => {
            const dayDate = parseISO(key);
            const isCurrent = key === todayKey;
            
            result.push({
              key,
              label: format(dayDate, "d"),
              bookings: value.count,
              revenue: value.revenue,
              isCurrent,
            });
          });
          
          result.sort((a, b) => a.key.localeCompare(b.key));
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching trends:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrends();
  }, [businessId, currentWeekBookings, view]);

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(d => metric === "bookings" ? d.bookings : d.revenue), 1);
  const avgValue = data.length > 1 
    ? data.slice(0, -1).reduce((sum, d) => sum + (metric === "bookings" ? d.bookings : d.revenue), 0) / (data.length - 1)
    : 0;

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
            {view === "weekly" ? "8-Week" : "30-Day"} Trends
          </span>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
              <TabsList className="h-7">
                <TabsTrigger value="weekly" className="text-xs px-2 py-1 h-5">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="daily" className="text-xs px-2 py-1 h-5">
                  Daily
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
          Avg: {formatAvg(avgValue)}/{view === "weekly" ? "week" : "day"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
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
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
                interval={view === "daily" ? 4 : 0}
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
                    const point = payload[0].payload as DataPoint;
                    const dateLabel = view === "weekly" 
                      ? `Week of ${point.label}`
                      : format(parseISO(point.key), "MMM d, yyyy");
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          {dateLabel}
                          {point.isCurrent && (view === "weekly" ? " (Current)" : " (Today)")}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {metric === "bookings" 
                            ? `${point.bookings} bookings`
                            : `£${point.revenue.toFixed(2)}`
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
                  const { cx, cy, payload, index } = props;
                  const color = metric === "bookings" ? "hsl(var(--primary))" : "hsl(var(--chart-2))";
                  
                  // For daily view, only show dots for current and every 5th point
                  if (view === "daily" && !payload.isCurrent && index % 5 !== 0) {
                    return <circle key={index} cx={cx} cy={cy} r={0} />;
                  }
                  
                  if (payload.isCurrent) {
                    return (
                      <circle
                        key={index}
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
                      key={index}
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
