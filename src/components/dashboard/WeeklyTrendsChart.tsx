import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, format, parseISO } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface WeeklyTrendsChartProps {
  businessId: string;
  currentWeekBookings: number;
}

interface WeekData {
  week: string;
  weekLabel: string;
  bookings: number;
  isCurrent: boolean;
}

export function WeeklyTrendsChart({ businessId, currentWeekBookings }: WeeklyTrendsChartProps) {
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const eightWeeksAgo = subWeeks(currentWeekStart, 7);
        
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("start_time")
          .eq("business_id", businessId)
          .gte("start_time", eightWeeksAgo.toISOString())
          .neq("status", "cancelled");
        
        if (error) throw error;
        
        // Group bookings by week
        const weeklyCountsMap = new Map<string, number>();
        
        // Initialize all 8 weeks with 0
        for (let i = 7; i >= 0; i--) {
          const weekStart = subWeeks(currentWeekStart, i);
          const weekKey = format(weekStart, "yyyy-MM-dd");
          weeklyCountsMap.set(weekKey, 0);
        }
        
        // Count bookings per week
        bookings?.forEach(booking => {
          const bookingDate = parseISO(booking.start_time);
          const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, "yyyy-MM-dd");
          
          if (weeklyCountsMap.has(weekKey)) {
            weeklyCountsMap.set(weekKey, (weeklyCountsMap.get(weekKey) || 0) + 1);
          }
        });
        
        // Convert to array for chart
        const data: WeekData[] = [];
        const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
        
        weeklyCountsMap.forEach((count, weekKey) => {
          const weekDate = parseISO(weekKey);
          const isCurrent = weekKey === currentWeekKey;
          
          data.push({
            week: weekKey,
            weekLabel: format(weekDate, "MMM d"),
            bookings: isCurrent ? currentWeekBookings : count,
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

  const maxBookings = Math.max(...weeklyData.map(d => d.bookings), 1);
  const avgBookings = weeklyData.length > 1 
    ? weeklyData.slice(0, -1).reduce((sum, d) => sum + d.bookings, 0) / (weeklyData.length - 1)
    : 0;

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            8-Week Booking Trends
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Avg: {avgBookings.toFixed(1)}/week
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={weeklyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                width={30}
                domain={[0, Math.ceil(maxBookings * 1.1)]}
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
                          {data.bookings} bookings
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#bookingsGradient)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isCurrent) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="hsl(var(--primary))"
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
                      fill="hsl(var(--primary))"
                      fillOpacity={0.5}
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--primary))",
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
