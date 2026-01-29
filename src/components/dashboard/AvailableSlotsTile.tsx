import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  parseISO, 
  isWithinInterval,
  addMinutes,
  isSameDay,
  isToday,
  isBefore
} from "date-fns";
import { cn } from "@/lib/utils";

interface AvailableSlotsTileProps {
  businessId: string;
}

interface DaySlots {
  date: Date;
  dayName: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

interface WorkingHours {
  [key: string]: { start: string; end: string } | undefined;
}

const SLOT_DURATION_MINUTES = 30; // Default slot duration

export function AvailableSlotsTile({ businessId }: AvailableSlotsTileProps) {
  const navigate = useNavigate();
  const [daySlots, setDaySlots] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDayClick = (date: Date) => {
    const dateParam = format(date, "yyyy-MM-dd");
    navigate(`/calendar?date=${dateParam}`);
  };

  useEffect(() => {
    const calculateSlots = async () => {
      if (!businessId) return;
      
      setLoading(true);
      
      try {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        // Fetch staff with working hours and bookings in parallel
        const [staffResult, bookingsResult] = await Promise.all([
          supabase
            .from("staff")
            .select("id, working_hours")
            .eq("business_id", businessId)
            .eq("is_active", true),
          supabase
            .from("bookings")
            .select("start_time, end_time, staff_id")
            .eq("business_id", businessId)
            .gte("start_time", weekStart.toISOString())
            .lte("start_time", weekEnd.toISOString())
            .neq("status", "cancelled"),
        ]);

        if (staffResult.error) throw staffResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        const staff = staffResult.data || [];
        const bookings = bookingsResult.data || [];
        
        // Calculate slots for each day of the week
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        
        const slotsPerDay: DaySlots[] = days.map(date => {
          const dayName = format(date, "EEEE").toLowerCase();
          const shortDayName = format(date, "EEE");
          
          let totalSlots = 0;
          let bookedSlots = 0;
          
          // Calculate total available slots based on all staff working hours
          staff.forEach(member => {
            const workingHours = member.working_hours as WorkingHours | null;
            const dayHours = workingHours?.[dayName];
            
            if (dayHours?.start && dayHours?.end) {
              // Parse working hours
              const [startHour, startMin] = dayHours.start.split(":").map(Number);
              const [endHour, endMin] = dayHours.end.split(":").map(Number);
              
              const dayStart = new Date(date);
              dayStart.setHours(startHour, startMin, 0, 0);
              
              const dayEnd = new Date(date);
              dayEnd.setHours(endHour, endMin, 0, 0);
              
              // Count slots in this time range
              let currentSlot = dayStart;
              while (isBefore(currentSlot, dayEnd)) {
                // Skip past slots for today
                if (!isToday(date) || !isBefore(currentSlot, now)) {
                  totalSlots++;
                }
                currentSlot = addMinutes(currentSlot, SLOT_DURATION_MINUTES);
              }
            }
          });
          
          // Count booked slots for this day
          bookings.forEach(booking => {
            const bookingStart = parseISO(booking.start_time);
            if (isSameDay(bookingStart, date)) {
              // Each booking takes up slots based on its duration
              const bookingEnd = parseISO(booking.end_time);
              const durationMinutes = (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60);
              bookedSlots += Math.ceil(durationMinutes / SLOT_DURATION_MINUTES);
            }
          });
          
          return {
            date,
            dayName: shortDayName,
            totalSlots,
            bookedSlots: Math.min(bookedSlots, totalSlots),
            availableSlots: Math.max(0, totalSlots - bookedSlots),
          };
        });
        
        setDaySlots(slotsPerDay);
      } catch (error) {
        console.error("Error calculating available slots:", error);
      } finally {
        setLoading(false);
      }
    };
    
    calculateSlots();
  }, [businessId]);

  const getSlotStatus = (day: DaySlots) => {
    if (day.totalSlots === 0) return "closed";
    const fillRate = day.bookedSlots / day.totalSlots;
    if (fillRate >= 0.8) return "full";
    if (fillRate >= 0.5) return "moderate";
    return "available";
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "full":
        return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
      case "moderate":
        return "bg-amber-500/20 text-amber-600 border-amber-500/30";
      case "available":
        return "bg-rose-500/20 text-rose-600 border-rose-500/30";
      case "closed":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted text-muted-foreground";
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

  const totalAvailable = daySlots.reduce((sum, day) => sum + day.availableSlots, 0);
  const totalBooked = daySlots.reduce((sum, day) => sum + day.bookedSlots, 0);

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Week Availability
          </span>
          <Badge variant="outline" className="font-normal">
            {totalAvailable} open
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Daily breakdown */}
        <div className="grid grid-cols-7 gap-1">
          {daySlots.map((day) => {
            const status = getSlotStatus(day);
            const isPast = isBefore(day.date, new Date()) && !isToday(day.date);
            
            return (
              <button
                key={day.dayName}
                onClick={() => handleDayClick(day.date)}
                className={cn(
                  "flex flex-col items-center p-1.5 rounded-lg border text-center transition-all hover:scale-105 hover:shadow-md cursor-pointer",
                  isPast ? "opacity-40" : "",
                  isToday(day.date) ? "ring-1 ring-primary" : "",
                  getStatusStyles(status)
                )}
              >
                <span className="text-[10px] font-medium uppercase">
                  {day.dayName}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {day.availableSlots}
                </span>
                <span className="text-[9px] opacity-70">
                  {status === "closed" ? "off" : "slots"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Needs filling
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Busy
            </span>
          </div>
          <span>{totalBooked} booked</span>
        </div>
      </CardContent>
    </Card>
  );
}
