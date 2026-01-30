import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, subDays, subMonths, format, parseISO, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface WeeklyTrendsChartProps {
  businessId: string;
  currentWeekBookings: number;
  hideRevenue?: boolean;
}

interface DataPoint {
  key: string;
  label: string;
  bookings: number;
  revenue: number;
  isCurrent: boolean;
}

type MetricType = "bookings" | "revenue";

type DateRangeType = "7days" | "30days" | "8weeks" | "3months" | "6months";

interface DateRangeOption {
  value: DateRangeType;
  label: string;
  shortLabel: string;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: "7days", label: "Last 7 Days", shortLabel: "7D" },
  { value: "30days", label: "Last 30 Days", shortLabel: "30D" },
  { value: "8weeks", label: "Last 8 Weeks", shortLabel: "8W" },
  { value: "3months", label: "Last 3 Months", shortLabel: "3M" },
  { value: "6months", label: "Last 6 Months", shortLabel: "6M" },
];

const TRENDS_RANGE_KEY = "dashboard-trends-range";

function getStoredRange(): DateRangeType {
  try {
    const stored = localStorage.getItem(TRENDS_RANGE_KEY);
    if (stored && DATE_RANGE_OPTIONS.some(o => o.value === stored)) {
      return stored as DateRangeType;
    }
  } catch {
    // Ignore
  }
  return "8weeks";
}

export function WeeklyTrendsChart({ businessId, currentWeekBookings, hideRevenue = false }: WeeklyTrendsChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("bookings");
  const [dateRange, setDateRange] = useState<DateRangeType>(getStoredRange);

  // Persist date range selection
  useEffect(() => {
    localStorage.setItem(TRENDS_RANGE_KEY, dateRange);
  }, [dateRange]);

  // Reset to bookings if revenue is hidden while viewing revenue
  useEffect(() => {
    if (hideRevenue && metric === "revenue") {
      setMetric("bookings");
    }
  }, [hideRevenue, metric]);

  // Determine if using daily or weekly grouping based on range
  const useDailyGrouping = dateRange === "7days" || dateRange === "30days";

  useEffect(() => {
    const fetchTrends = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const now = new Date();
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const today = startOfDay(now);
        
        // Calculate start date based on range
        let startDate: Date;
        let numDays = 7;
        let numWeeks = 8;
        
        switch (dateRange) {
          case "7days":
            startDate = subDays(today, 6);
            numDays = 7;
            break;
          case "30days":
            startDate = subDays(today, 29);
            numDays = 30;
            break;
          case "8weeks":
            startDate = subWeeks(currentWeekStart, 7);
            numWeeks = 8;
            break;
          case "3months":
            startDate = subMonths(currentWeekStart, 3);
            numWeeks = 13;
            break;
          case "6months":
            startDate = subMonths(currentWeekStart, 6);
            numWeeks = 26;
            break;
          default:
            startDate = subWeeks(currentWeekStart, 7);
            numWeeks = 8;
        }
        
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("start_time, total_price")
          .eq("business_id", businessId)
          .gte("start_time", startDate.toISOString())
          .neq("status", "cancelled");
        
        if (error) throw error;
        
        if (useDailyGrouping) {
          // Group bookings by day
          const dailyMap = new Map<string, { count: number; revenue: number }>();
          
          for (let i = numDays - 1; i >= 0; i--) {
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
        } else {
          // Group bookings by week
          const weeklyMap = new Map<string, { count: number; revenue: number }>();
          
          for (let i = numWeeks - 1; i >= 0; i--) {
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
        }
      } catch (error) {
        console.error("Error fetching trends:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrends();
  }, [businessId, currentWeekBookings, dateRange, useDailyGrouping]);

  const currentRangeOption = DATE_RANGE_OPTIONS.find(o => o.value === dateRange) || DATE_RANGE_OPTIONS[2];

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

  // Determine x-axis interval based on data length
  const getXAxisInterval = () => {
    if (data.length <= 8) return 0;
    if (data.length <= 15) return 1;
    if (data.length <= 30) return 4;
    return Math.floor(data.length / 6);
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Trends
          </span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1">
                  {currentRangeOption.shortLabel}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={dateRange === option.value ? "bg-accent" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {!hideRevenue && (
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
            )}
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Avg: {formatAvg(avgValue)}/{useDailyGrouping ? "day" : "week"}
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
                interval={getXAxisInterval()}
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
                    const dateLabel = useDailyGrouping 
                      ? format(parseISO(point.key), "MMM d, yyyy")
                      : `Week of ${point.label}`;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          {dateLabel}
                          {point.isCurrent && (useDailyGrouping ? " (Today)" : " (Current)")}
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
                  
                  // For larger datasets, only show dots for current and sampled points
                  const showDot = data.length <= 8 || payload.isCurrent || index % Math.ceil(data.length / 8) === 0;
                  if (!showDot) {
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
