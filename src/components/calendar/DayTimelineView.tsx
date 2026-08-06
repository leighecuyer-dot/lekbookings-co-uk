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
import {
  TIME_SLOTS,
  getStaffColor,
  getStatusColor,
  isStaffAvailableAtSlot,
} from "./dayViewUtils";


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
  // Get all bookings for a time slot
  const getBookingsForSlot = (slotTime: string) => {
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = setMinutes(setHours(selectedDate, slotHour), slotMinute);
    const slotTimestamp = slotDate.getTime();

    return bookings.filter((booking) => {
      const bookingStart = parseISO(booking.start_time).getTime();
      const bookingEnd = parseISO(booking.end_time).getTime();
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
          const slotBookings = getBookingsForSlot(slot);
          // Filter to only bookings that START at this slot
          const startingBookings = slotBookings.filter((b) => isBookingStart(slot, b));
          // Bookings that are continuing (started earlier)
          const continuingBookings = slotBookings.filter((b) => !isBookingStart(slot, b));

          // If all bookings in this slot are continuing (none start here), skip
          // unless there are no bookings at all (free slot)
          if (slotBookings.length > 0 && startingBookings.length === 0) {
            return null;
          }

          // Render starting bookings
          if (startingBookings.length > 0) {
            return (
              <div key={slot} className="space-y-1">
                {startingBookings.map((booking) => {
                  const slotSpan = getBookingSlotSpan(booking);
                  const height = slotSpan * 52 - 4;
                  const service = services.find((s) => s.id === booking.service_id);
                  const staff = staffList.find((s) => s.id === booking.staff_id);
                  const isDragging = draggingBookingId === booking.id;

                  const staffColor = getStaffColor(booking.staff_id, staffList);

                  return (
                    <div
                      key={booking.id}
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
                        className="flex-1 flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl sm:rounded-2xl"
                        style={{
                          backgroundColor: staffColor.bg,
                          color: staffColor.text,
                          borderLeft: service?.color ? `4px solid ${service.color}` : undefined,
                        }}
                      >
                        <GripVertical className="w-4 h-4 shrink-0 hidden sm:block" style={{ opacity: 0.4 }} />
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base">
                              {format(parseISO(booking.start_time), "HH:mm")}
                            </p>
                            <p className="text-[10px] sm:text-xs" style={{ opacity: 0.7 }}>
                              {format(parseISO(booking.end_time), "HH:mm")}
                            </p>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm sm:text-base">
                            {booking.customer_name}
                          </p>
                          <p className="text-xs sm:text-sm truncate" style={{ opacity: 0.8 }}>
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
                })}
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
              <div className="w-12 sm:w-16 shrink-0 text-xs sm:text-sm text-muted-foreground">
                {slot}
              </div>

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
