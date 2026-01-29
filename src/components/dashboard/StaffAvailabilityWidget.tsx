import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, parseISO, startOfWeek, addDays } from "date-fns";
import { Clock, Calendar, Users, Settings2, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WorkingDay {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  monday: WorkingDay;
  tuesday: WorkingDay;
  wednesday: WorkingDay;
  thursday: WorkingDay;
  friday: WorkingDay;
  saturday: WorkingDay;
  sunday: WorkingDay;
}

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  working_hours: WorkingHours | null;
}

type DisplayMode = "today" | "week" | "status";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface StaffAvailabilityWidgetProps {
  businessId: string;
}

export function StaffAvailabilityWidget({ businessId }: StaffAvailabilityWidgetProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const saved = localStorage.getItem(`staff-availability-mode-${businessId}`);
    return (saved as DisplayMode) || "today";
  });

  useEffect(() => {
    async function fetchStaff() {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, is_active, working_hours")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setStaff(data.map(s => ({
          ...s,
          working_hours: s.working_hours as unknown as WorkingHours | null,
        })));
      }
      setLoading(false);
    }

    fetchStaff();
  }, [businessId]);

  useEffect(() => {
    localStorage.setItem(`staff-availability-mode-${businessId}`, displayMode);
  }, [displayMode, businessId]);

  const getTodayKey = (): keyof WorkingHours => {
    const dayIndex = new Date().getDay();
    // JS: 0 = Sunday, need to map to our keys
    const mapping = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return mapping[dayIndex] as keyof WorkingHours;
  };

  const isStaffAvailableNow = (staffMember: StaffMember): boolean => {
    if (!staffMember.working_hours) return false;
    const todayKey = getTodayKey();
    const todayHours = staffMember.working_hours[todayKey];
    if (!todayHours?.enabled) return false;

    const now = new Date();
    const currentTime = format(now, "HH:mm");
    return currentTime >= todayHours.start && currentTime <= todayHours.end;
  };

  const getStaffTodayHours = (staffMember: StaffMember): string => {
    if (!staffMember.working_hours) return "No schedule";
    const todayKey = getTodayKey();
    const todayHours = staffMember.working_hours[todayKey];
    if (!todayHours?.enabled) return "Off today";
    return `${todayHours.start} - ${todayHours.end}`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active staff members
          </p>
        </CardContent>
      </Card>
    );
  }

  // Only show widget if more than one staff member
  if (staff.length === 1) {
    return null;
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Staff Availability
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings2 className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDisplayMode("today")}>
              <Clock className="w-4 h-4 mr-2" />
              Today's Schedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDisplayMode("week")}>
              <Calendar className="w-4 h-4 mr-2" />
              Weekly Overview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDisplayMode("status")}>
              <Users className="w-4 h-4 mr-2" />
              Status Badges
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pt-0">
        {displayMode === "today" && (
          <div className="space-y-2">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isStaffAvailableNow(s) ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                  <span className="text-sm font-medium truncate max-w-[120px]">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getStaffTodayHours(s)}
                </span>
              </div>
            ))}
          </div>
        )}

        {displayMode === "week" && (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left font-medium py-1 pr-2 text-muted-foreground">Staff</th>
                  {DAY_LABELS_SHORT.map((day, i) => (
                    <th key={day} className="text-center font-medium py-1 px-1 text-muted-foreground">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1 pr-2 font-medium truncate max-w-[80px]">{s.name}</td>
                    {DAYS_OF_WEEK.map((dayKey) => {
                      const dayHours = s.working_hours?.[dayKey];
                      const isAvailable = dayHours?.enabled;
                      return (
                        <td key={dayKey} className="text-center py-1 px-1">
                          <div className={cn(
                            "w-5 h-5 mx-auto rounded flex items-center justify-center",
                            isAvailable ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/50"
                          )}>
                            {isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {displayMode === "status" && (
          <div className="flex flex-wrap gap-2">
            {staff.map((s) => {
              const available = isStaffAvailableNow(s);
              return (
                <Badge
                  key={s.id}
                  variant={available ? "default" : "secondary"}
                  className="text-xs"
                >
                  {s.name}
                  {available && <span className="ml-1">•</span>}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
