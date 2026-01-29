import { format, parseISO, setHours, setMinutes } from "date-fns";
import { Clock, Plus, Users, Palmtree, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  service_id: string | null;
  staff_id: string | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
}

interface WorkingHoursDay {
  start: string;
  end: string;
  enabled?: boolean;
}

interface WorkingHours {
  [key: string]: WorkingHoursDay;
}

interface Staff {
  id: string;
  name: string;
  working_hours?: WorkingHours | null;
}

interface DayTimelineViewProps {
  selectedDate: Date;
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onSlotClick: (time: string, staffId?: string) => void;
  loading?: boolean;
  isOnLeave?: (staffId: string, date: Date) => boolean;
  // Drag and drop props
  onDragStart?: (e: React.DragEvent, booking: Booking) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetDate: Date, targetTime: string) => void;
  draggingBookingId?: string | null;
}

// Generate time slots from 8:00 to 18:00 (30-min intervals)
const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-background text-foreground";
    case "pending":
      return "bg-background/80 text-foreground";
    case "cancelled":
      return "bg-background/50 text-foreground";
    case "completed":
      return "bg-background/60 text-foreground";
    default:
      return "bg-background text-foreground";
  }
};

// Helper to check if a staff member is available at a specific time slot
function isStaffAvailableAtSlot(
  staff: Staff,
  slotTime: string,
  date: Date,
  isOnLeave?: (staffId: string, date: Date) => boolean
): boolean {
  // Check if on leave
  if (isOnLeave && isOnLeave(staff.id, date)) {
    return false;
  }

  // Check working hours
  if (!staff.working_hours) return false;

  const dayName = format(date, "EEEE").toLowerCase();
  const dayHours = staff.working_hours[dayName];

  if (!dayHours) return false;
  if (dayHours.enabled === false) return false;

  return slotTime >= dayHours.start && slotTime < dayHours.end;
}

// Get available staff for a slot
function getAvailableStaffForSlot(
  staffList: Staff[],
  slotTime: string,
  date: Date,
  bookings: Booking[],
  isOnLeave?: (staffId: string, date: Date) => boolean
): Staff[] {
  // Find staff who are booked at this slot
  const [slotHour, slotMinute] = slotTime.split(":").map(Number);
  const slotDate = setMinutes(setHours(date, slotHour), slotMinute);
  const slotTimestamp = slotDate.getTime();

  const bookedStaffIds = new Set(
    bookings
      .filter((booking) => {
        const bookingStart = parseISO(booking.start_time).getTime();
        const bookingEnd = parseISO(booking.end_time).getTime();
        return slotTimestamp >= bookingStart && slotTimestamp < bookingEnd;
      })
      .map((booking) => booking.staff_id)
      .filter(Boolean)
  );

  return staffList.filter((staff) => {
    // Must be available at this time
    if (!isStaffAvailableAtSlot(staff, slotTime, date, isOnLeave)) {
      return false;
    }
    // Must not be already booked
    return !bookedStaffIds.has(staff.id);
  });
}

// Get staff on leave for a specific date
function getStaffOnLeave(
  staffList: Staff[],
  date: Date,
  isOnLeave?: (staffId: string, date: Date) => boolean
): Staff[] {
  if (!isOnLeave) return [];
  return staffList.filter((staff) => isOnLeave(staff.id, date));
}

export function DayTimelineView({
  selectedDate,
  bookings,
  services,
  staffList,
  onBookingClick,
  onSlotClick,
  loading,
  isOnLeave,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggingBookingId,
}: DayTimelineViewProps) {
  // Check if a time slot has a booking
  const getBookingForSlot = (slotTime: string) => {
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = setMinutes(setHours(selectedDate, slotHour), slotMinute);
    const slotTimestamp = slotDate.getTime();

    return bookings.find((booking) => {
      const bookingStart = parseISO(booking.start_time).getTime();
      const bookingEnd = parseISO(booking.end_time).getTime();
      // Check if slot falls within booking time range
      return slotTimestamp >= bookingStart && slotTimestamp < bookingEnd;
    });
  };

  // Check if this slot is the start of a booking
  const isBookingStart = (slotTime: string, booking: Booking) => {
    const bookingStartTime = format(parseISO(booking.start_time), "HH:mm");
    return bookingStartTime === slotTime;
  };

  // Calculate how many slots a booking spans
  const getBookingSlotSpan = (booking: Booking) => {
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    return Math.ceil(durationMinutes / 30);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {TIME_SLOTS.map((slot) => {
          const booking = getBookingForSlot(slot);
          const isStart = booking ? isBookingStart(slot, booking) : false;
          const service = booking ? services.find((s) => s.id === booking.service_id) : null;
          const staff = booking ? staffList.find((s) => s.id === booking.staff_id) : null;
          const isDragging = booking && draggingBookingId === booking.id;

          // If this slot is occupied by a booking but isn't the start, skip rendering
          if (booking && !isStart) {
            return null;
          }

          // If this is the start of a booking, render the booking card
          if (booking && isStart) {
            const slotSpan = getBookingSlotSpan(booking);
            // Height: each slot is ~52px (min-h-[52px] + gap)
            const height = slotSpan * 52 - 4; // Subtract gap

            return (
              <div
                key={slot}
                draggable
                onDragStart={(e) => onDragStart?.(e, booking)}
                onDragEnd={onDragEnd}
                onClick={() => onBookingClick(booking)}
                className={cn(
                  "flex items-stretch gap-2 sm:gap-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all",
                  isDragging && "opacity-50"
                )}
                style={{ minHeight: `${height}px` }}
              >
                {/* Time label */}
                <div className="w-12 sm:w-16 shrink-0 text-xs sm:text-sm text-muted-foreground pt-2">
                  {slot}
                </div>

                {/* Booking card */}
                <div
                  className="flex-1 flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-foreground text-background"
                  style={{
                    borderLeft: service?.color ? `4px solid ${service.color}` : undefined,
                  }}
                >
                  <GripVertical className="w-4 h-4 text-background/40 shrink-0 hidden sm:block" />
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-background/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-background" />
                    </div>
                    <div>
                      <p className="font-semibold text-background text-sm sm:text-base">
                        {format(parseISO(booking.start_time), "HH:mm")}
                      </p>
                      <p className="text-[10px] sm:text-xs text-background/60">
                        {format(parseISO(booking.end_time), "HH:mm")}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-background truncate text-sm sm:text-base">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs sm:text-sm text-background/70 truncate">
                      {service?.name || "No service"}
                      {staff && ` • ${staff.name}`}
                    </p>
                  </div>

                  <Badge className={`${getStatusColor(booking.status)} text-[10px] sm:text-xs`}>
                    {booking.status}
                  </Badge>
                </div>
              </div>
            );
          }

          // Free slot - show available staff
          const availableStaff = getAvailableStaffForSlot(
            staffList,
            slot,
            selectedDate,
            bookings,
            isOnLeave
          );
          const hasAvailableStaff = availableStaff.length > 0;
          const staffOnLeave = getStaffOnLeave(staffList, selectedDate, isOnLeave);
          const hasStaffOnLeave = staffOnLeave.length > 0;

          // Pre-select the first available staff member when clicking a slot
          const preSelectedStaffId = availableStaff.length > 0 ? availableStaff[0].id : undefined;

          return (
            <div
              key={slot}
              onClick={() => hasAvailableStaff && onSlotClick(slot, preSelectedStaffId)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop?.(e, selectedDate, slot)}
              className={cn(
                "flex items-center gap-2 sm:gap-3 min-h-[52px] group transition-all",
                hasAvailableStaff ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                draggingBookingId && "hover:bg-primary/10 hover:border-primary"
              )}
            >
              {/* Time label */}
              <div className="w-12 sm:w-16 shrink-0 text-xs sm:text-sm text-muted-foreground">
                {slot}
              </div>

              {/* Free slot indicator */}
              <div className={cn(
                "flex-1 flex items-center justify-between gap-2 p-2 sm:p-3 rounded-xl border-2 border-dashed transition-all",
                hasAvailableStaff
                  ? "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                  : "border-muted-foreground/10 bg-muted/30",
                draggingBookingId && hasAvailableStaff && "border-primary/30 bg-primary/5"
              )}>
                <div className="flex items-center gap-2">
                  <Plus className={cn(
                    "w-4 h-4 transition-colors",
                    hasAvailableStaff
                      ? "text-muted-foreground/40 group-hover:text-primary"
                      : "text-muted-foreground/20"
                  )} />
                  <span className={cn(
                    "text-xs sm:text-sm transition-colors",
                    hasAvailableStaff
                      ? "text-muted-foreground/40 group-hover:text-primary"
                      : "text-muted-foreground/30"
                  )}>
                    {draggingBookingId ? "Drop here to reschedule" : hasAvailableStaff ? "Available" : "No staff available"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Leave indicator */}
                  {hasStaffOnLeave && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-warning/10 text-warning-foreground">
                          <Palmtree className="w-3 h-3" />
                          <span>{staffOnLeave.length}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <div>
                          <p className="font-medium mb-1">On leave today:</p>
                          <ul className="text-xs space-y-0.5">
                            {staffOnLeave.map((s) => (
                              <li key={s.id}>• {s.name}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Staff availability indicator */}
                  {staffList.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                          hasAvailableStaff
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Users className="w-3 h-3" />
                          <span>{availableStaff.length}/{staffList.length}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        {hasAvailableStaff ? (
                          <div>
                            <p className="font-medium mb-1">Available staff:</p>
                            <ul className="text-xs space-y-0.5">
                              {availableStaff.map((s) => (
                                <li key={s.id}>• {s.name}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p>No staff available at this time</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
