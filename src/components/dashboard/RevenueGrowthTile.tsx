import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Loader2, PoundSterling } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, subWeeks, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { PrivacyLockOverlay } from "./PrivacyLockOverlay";

interface RevenueGrowthTileProps {
  businessId: string;
  locked?: boolean;
}

interface RevenueData {
  currentWeekRevenue: number;
  previousWeekRevenue: number;
  percentageChange: number;
  trend: "up" | "down" | "neutral";
}

export function RevenueGrowthTile({ businessId, locked = false }: RevenueGrowthTileProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!businessId) return;

      setLoading(true);

      try {
        const now = new Date();
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const previousWeekStart = subWeeks(currentWeekStart, 1);
        const previousWeekEnd = subWeeks(currentWeekEnd, 1);

        // Fetch bookings for current and previous week
        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("start_time, total_price")
          .eq("business_id", businessId)
          .gte("start_time", previousWeekStart.toISOString())
          .lte("start_time", currentWeekEnd.toISOString())
          .neq("status", "cancelled");

        if (error) throw error;

        let currentWeekRevenue = 0;
        let previousWeekRevenue = 0;

        bookings?.forEach((booking) => {
          const bookingDate = new Date(booking.start_time);
          const revenue = booking.total_price || 0;

          if (bookingDate >= currentWeekStart && bookingDate <= currentWeekEnd) {
            currentWeekRevenue += revenue;
          } else if (bookingDate >= previousWeekStart && bookingDate <= previousWeekEnd) {
            previousWeekRevenue += revenue;
          }
        });

        // Calculate percentage change
        let percentageChange = 0;
        if (previousWeekRevenue > 0) {
          percentageChange = ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100;
        } else if (currentWeekRevenue > 0) {
          percentageChange = 100; // If no previous revenue but current has revenue
        }

        const trend: "up" | "down" | "neutral" =
          percentageChange > 5 ? "up" : percentageChange < -5 ? "down" : "neutral";

        setData({
          currentWeekRevenue,
          previousWeekRevenue,
          percentageChange,
          trend,
        });
      } catch (error) {
        console.error("Error fetching revenue data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [businessId]);

  const getTrendConfig = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return {
          icon: TrendingUp,
          bgClass: "bg-emerald-500/10",
          textClass: "text-emerald-600",
          iconBg: "bg-emerald-500/20",
          label: "Growing",
        };
      case "down":
        return {
          icon: TrendingDown,
          bgClass: "bg-rose-500/10",
          textClass: "text-rose-600",
          iconBg: "bg-rose-500/20",
          label: "Declining",
        };
      case "neutral":
        return {
          icon: Minus,
          bgClass: "bg-muted",
          textClass: "text-muted-foreground",
          iconBg: "bg-muted-foreground/20",
          label: "Stable",
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

  if (!data) {
    return null;
  }

  const config = getTrendConfig(data.trend);
  const TrendIcon = config.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={cn("border-0 shadow-soft overflow-hidden relative", config.bgClass)}>
      {locked && (
        <PrivacyLockOverlay 
          label="Revenue Hidden" 
          dataType="revenue"
          showRequestAccess={locked}
        />
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
            Revenue Growth
          </span>
          <span className="text-xs font-normal text-muted-foreground">vs last week</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.iconBg)}>
            <TrendIcon className={cn("w-5 h-5", config.textClass)} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatCurrency(data.currentWeekRevenue)}</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  data.percentageChange > 0
                    ? "text-success"
                    : data.percentageChange < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {data.percentageChange > 0 ? "+" : ""}
                {data.percentageChange.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {config.label} • Last week: {formatCurrency(data.previousWeekRevenue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
