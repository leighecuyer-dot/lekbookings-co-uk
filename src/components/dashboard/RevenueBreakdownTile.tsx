import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PoundSterling, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PrivacyLockOverlay } from "./PrivacyLockOverlay";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

interface RevenueBreakdownTileProps {
  businessId: string;
  locked?: boolean;
}

interface StaffRevenue {
  staffId: string;
  staffName: string;
  bookingCount: number;
  totalRevenue: number;
  commissionPercentage: number;
  staffEarnings: number;
  businessRetained: number;
  revenueTrackingEnabled: boolean;
}

interface RevenueBreakdownData {
  totalCompletedBookings: number;
  totalRevenue: number;
  staffBreakdown: StaffRevenue[];
  unassignedRevenue: number;
  unassignedBookings: number;
  businessNetRevenue: number;
  totalStaffEarnings: number;
}

type TimePeriod = "week" | "month";

export function RevenueBreakdownTile({ businessId, locked = false }: RevenueBreakdownTileProps) {
  const [data, setData] = useState<RevenueBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>("week");

  useEffect(() => {
    const fetchRevenueBreakdown = async () => {
      if (!businessId) return;

      setLoading(true);

      try {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (period === "week") {
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
        } else {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        }

        // Fetch completed bookings with staff info
        const [bookingsResult, staffResult] = await Promise.all([
          supabase
            .from("bookings")
            .select("id, total_price, staff_id, status")
            .eq("business_id", businessId)
            .eq("status", "completed")
            .gte("start_time", startDate.toISOString())
            .lte("start_time", endDate.toISOString()),
          supabase
            .from("staff")
            .select("id, name, revenue_tracking_enabled, commission_percentage")
            .eq("business_id", businessId),
        ]);

        if (bookingsResult.error) throw bookingsResult.error;
        if (staffResult.error) throw staffResult.error;

        const bookings = bookingsResult.data || [];
        const staffList = staffResult.data || [];

        // Create a map for quick staff lookup
        const staffMap = new Map(staffList.map((s) => [s.id, s]));

        // Calculate revenue by staff
        const staffRevenueMap = new Map<string, StaffRevenue>();
        let unassignedRevenue = 0;
        let unassignedBookings = 0;
        let totalRevenue = 0;

        bookings.forEach((booking) => {
          const revenue = booking.total_price || 0;
          totalRevenue += revenue;

          if (!booking.staff_id) {
            unassignedRevenue += revenue;
            unassignedBookings++;
            return;
          }

          const staff = staffMap.get(booking.staff_id);
          if (!staff) {
            unassignedRevenue += revenue;
            unassignedBookings++;
            return;
          }

          const existing = staffRevenueMap.get(booking.staff_id);
          if (existing) {
            existing.bookingCount++;
            existing.totalRevenue += revenue;
            existing.staffEarnings = existing.totalRevenue * (existing.commissionPercentage / 100);
            existing.businessRetained = existing.totalRevenue - existing.staffEarnings;
          } else {
            const commissionPercentage = staff.commission_percentage;
            const staffEarnings = revenue * (commissionPercentage / 100);
            staffRevenueMap.set(booking.staff_id, {
              staffId: booking.staff_id,
              staffName: staff.name,
              bookingCount: 1,
              totalRevenue: revenue,
              commissionPercentage,
              staffEarnings,
              businessRetained: revenue - staffEarnings,
              revenueTrackingEnabled: staff.revenue_tracking_enabled,
            });
          }
        });

        const staffBreakdown = Array.from(staffRevenueMap.values())
          .filter((s) => s.revenueTrackingEnabled)
          .sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Calculate totals
        const totalStaffEarnings = staffBreakdown.reduce((sum, s) => sum + s.staffEarnings, 0);
        const businessNetRevenue = staffBreakdown.reduce((sum, s) => sum + s.businessRetained, 0) + unassignedRevenue;

        setData({
          totalCompletedBookings: bookings.length,
          totalRevenue,
          staffBreakdown,
          unassignedRevenue,
          unassignedBookings,
          businessNetRevenue,
          totalStaffEarnings,
        });
      } catch (error) {
        console.error("Error fetching revenue breakdown:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueBreakdown();
  }, [businessId, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 flex items-center justify-center min-h-[180px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const periodLabel = period === "week" ? "This Week" : "This Month";

  return (
    <Card className="border-0 shadow-soft overflow-hidden relative">
      {locked && (
        <PrivacyLockOverlay
          label="Revenue Hidden"
          dataType="revenue"
          showRequestAccess={locked}
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
            Revenue Breakdown
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={period === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button
              variant={period === "month" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              {data.totalCompletedBookings} completed booking{data.totalCompletedBookings !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-success/10">
            <p className="text-xs text-muted-foreground mb-1">Business Net</p>
            <p className="text-xl font-bold text-success">{formatCurrency(data.businessNetRevenue)}</p>
            <p className="text-xs text-muted-foreground">After staff earnings</p>
          </div>
        </div>

        {/* Staff earnings summary */}
        {data.totalStaffEarnings > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Earnings
              </span>
              <span className="text-sm font-semibold">{formatCurrency(data.totalStaffEarnings)}</span>
            </div>
            <Progress
              value={(data.totalStaffEarnings / data.totalRevenue) * 100}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {((data.totalStaffEarnings / data.totalRevenue) * 100).toFixed(0)}% of total revenue
            </p>
          </div>
        )}

        {/* Staff Breakdown Collapsible */}
        {data.staffBreakdown.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-2 h-auto"
              >
                <span className="text-sm font-medium">
                  Staff Breakdown ({data.staffBreakdown.length})
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {data.staffBreakdown.map((staff) => (
                <div
                  key={staff.staffId}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{staff.staffName}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {staff.commissionPercentage}% rate
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Bookings</p>
                      <p className="font-medium">{staff.bookingCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium">{formatCurrency(staff.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Earnings</p>
                      <p className="font-medium text-success">
                        {formatCurrency(staff.staffEarnings)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Unassigned revenue */}
              {data.unassignedRevenue > 0 && (
                <div className="p-3 rounded-lg border border-dashed bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(data.unassignedRevenue)} ({data.unassignedBookings} booking{data.unassignedBookings !== 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty state */}
        {data.totalCompletedBookings === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No completed bookings {periodLabel.toLowerCase()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
