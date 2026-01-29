import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, TrendingDown, Minus, MessageSquare, Mail, Phone, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, format } from "date-fns";
import { cn } from "@/lib/utils";

interface WeeklyPerformanceTileProps {
  businessId: string;
  currentWeekBookings: number;
  onSendSMS?: () => void;
  onSendEmail?: () => void;
}

type PerformanceLevel = "higher" | "lower" | "normal";

interface PerformanceData {
  level: PerformanceLevel;
  percentageChange: number;
  historicalAverage: number;
  weeksAnalyzed: number;
}

export function WeeklyPerformanceTile({ 
  businessId, 
  currentWeekBookings,
  onSendSMS,
  onSendEmail 
}: WeeklyPerformanceTileProps) {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculatePerformance = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        // Get bookings from the past 8 weeks (excluding current week)
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const eightWeeksAgo = subWeeks(currentWeekStart, 8);
        
        const { data: historicalBookings, error } = await supabase
          .from("bookings")
          .select("start_time")
          .eq("business_id", businessId)
          .gte("start_time", eightWeeksAgo.toISOString())
          .lt("start_time", currentWeekStart.toISOString());
        
        if (error) throw error;
        
        // Group bookings by week
        const weeklyCountsMap = new Map<string, number>();
        
        historicalBookings?.forEach(booking => {
          const bookingDate = new Date(booking.start_time);
          const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
          const weekKey = format(weekStart, "yyyy-MM-dd");
          weeklyCountsMap.set(weekKey, (weeklyCountsMap.get(weekKey) || 0) + 1);
        });
        
        const weeklyCounts = Array.from(weeklyCountsMap.values());
        const weeksAnalyzed = weeklyCounts.length;
        
        if (weeksAnalyzed === 0) {
          // No historical data - show as normal
          setPerformance({
            level: "normal",
            percentageChange: 0,
            historicalAverage: currentWeekBookings,
            weeksAnalyzed: 0,
          });
          return;
        }
        
        const historicalAverage = weeklyCounts.reduce((a, b) => a + b, 0) / weeksAnalyzed;
        
        // Calculate percentage change
        const percentageChange = historicalAverage > 0 
          ? ((currentWeekBookings - historicalAverage) / historicalAverage) * 100
          : 0;
        
        // Determine performance level (±15% threshold for normal)
        let level: PerformanceLevel = "normal";
        if (percentageChange > 15) {
          level = "higher";
        } else if (percentageChange < -15) {
          level = "lower";
        }
        
        setPerformance({
          level,
          percentageChange,
          historicalAverage,
          weeksAnalyzed,
        });
      } catch (error) {
        console.error("Error calculating weekly performance:", error);
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    };
    
    calculatePerformance();
  }, [businessId, currentWeekBookings]);

  const getPerformanceConfig = (level: PerformanceLevel) => {
    switch (level) {
      case "higher":
        return {
          icon: TrendingUp,
          label: "Above Average",
          description: "You're doing great this week!",
          bgClass: "bg-emerald-500/10",
          textClass: "text-emerald-600",
          iconBg: "bg-emerald-500/20",
        };
      case "lower":
        return {
          icon: TrendingDown,
          label: "Below Average",
          description: "Consider reaching out to fill slots",
          bgClass: "bg-amber-500/10",
          textClass: "text-amber-600",
          iconBg: "bg-amber-500/20",
        };
      case "normal":
        return {
          icon: Minus,
          label: "On Track",
          description: "Bookings are within normal range",
          bgClass: "bg-muted",
          textClass: "text-muted-foreground",
          iconBg: "bg-muted-foreground/20",
        };
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex items-center justify-center min-h-[140px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!performance) {
    return null;
  }

  const config = getPerformanceConfig(performance.level);
  const Icon = config.icon;

  return (
    <Card className={cn("border-0 shadow-soft overflow-hidden", config.bgClass)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Weekly Performance</span>
          {performance.weeksAnalyzed > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              vs {performance.weeksAnalyzed} week avg
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.iconBg)}>
            <Icon className={cn("w-5 h-5", config.textClass)} />
          </div>
          <div>
            <p className={cn("font-semibold", config.textClass)}>
              {config.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {performance.weeksAnalyzed > 0 ? (
                <>
                  {Math.abs(performance.percentageChange).toFixed(0)}% 
                  {performance.percentageChange >= 0 ? " above" : " below"} average
                  <span className="mx-1">•</span>
                  Avg: {performance.historicalAverage.toFixed(1)} bookings
                </>
              ) : (
                "Building baseline data..."
              )}
            </p>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">{config.description}</p>
        
        {performance.level === "lower" && (onSendSMS || onSendEmail) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 mt-2"
              >
                <MessageSquare className="h-4 w-4" />
                Send Campaign
                <ChevronDown className="h-3 w-3 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-[200px]">
              {onSendSMS && (
                <DropdownMenuItem onClick={onSendSMS} className="gap-2 cursor-pointer">
                  <Phone className="h-4 w-4" />
                  SMS Campaign
                </DropdownMenuItem>
              )}
              {onSendEmail && (
                <DropdownMenuItem onClick={onSendEmail} className="gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  Email Campaign
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
