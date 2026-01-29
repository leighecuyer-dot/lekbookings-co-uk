import { format, parseISO, setHours, setMinutes } from "date-fns";
import { Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface Staff {
  id: string;
  name: string;
}

interface DayTimelineViewProps {
  selectedDate: Date;
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onSlotClick: (time: string) => void;
  loading?: boolean;
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

export function DayTimelineView({
  selectedDate,
  bookings,
  services,
  staffList,
  onBookingClick,
  onSlotClick,
  loading,
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
    <div className="space-y-1">
      {TIME_SLOTS.map((slot) => {
        const booking = getBookingForSlot(slot);
        const isStart = booking ? isBookingStart(slot, booking) : false;
        const service = booking ? services.find((s) => s.id === booking.service_id) : null;
        const staff = booking ? staffList.find((s) => s.id === booking.staff_id) : null;

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
              onClick={() => onBookingClick(booking)}
              className="flex items-stretch gap-2 sm:gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
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

        // Free slot - clickable to create booking
        return (
          <div
            key={slot}
            onClick={() => onSlotClick(slot)}
            className="flex items-center gap-2 sm:gap-3 min-h-[52px] group cursor-pointer"
          >
            {/* Time label */}
            <div className="w-12 sm:w-16 shrink-0 text-xs sm:text-sm text-muted-foreground">
              {slot}
            </div>

            {/* Free slot indicator */}
            <div className={cn(
              "flex-1 flex items-center gap-2 p-2 sm:p-3 rounded-xl border-2 border-dashed",
              "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
            )}>
              <Plus className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              <span className="text-xs sm:text-sm text-muted-foreground/40 group-hover:text-primary transition-colors">
                Available
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
