import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  service_id: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface WeekViewProps {
  selectedDate: Date;
  bookings: Booking[];
  services: Service[];
  onBookingClick: (booking: Booking) => void;
}

export function WeekView({ selectedDate, bookings, services, onBookingClick }: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => isSameDay(parseISO(b.start_time), day));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-foreground text-background";
      case "pending":
        return "bg-muted-foreground text-background";
      case "cancelled":
        return "bg-destructive/50 text-destructive-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-3 text-center text-sm font-medium text-muted-foreground">
            Time
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center ${
                isSameDay(day, new Date())
                  ? "bg-foreground text-background"
                  : ""
              }`}
            >
              <p className="text-xs font-medium uppercase">
                {format(day, "EEE")}
              </p>
              <p className="text-lg font-semibold">{format(day, "d")}</p>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              <div className="p-2 text-xs text-muted-foreground border-r">
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
              {weekDays.map((day) => {
                const dayBookings = getBookingsForDay(day).filter((b) => {
                  const bookingHour = parseISO(b.start_time).getHours();
                  return bookingHour === hour;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="border-r p-1 min-h-[80px]"
                  >
                    {dayBookings.map((booking) => {
                      const service = services.find(
                        (s) => s.id === booking.service_id
                      );
                      return (
                        <div
                          key={booking.id}
                          onClick={() => onBookingClick(booking)}
                          className={`p-2 rounded-lg cursor-pointer text-xs mb-1 ${getStatusColor(
                            booking.status
                          )} hover:scale-[1.02] transition-transform`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">
                              {format(parseISO(booking.start_time), "HH:mm")}
                            </span>
                          </div>
                          <p className="font-semibold truncate">
                            {booking.customer_name}
                          </p>
                          <p className="text-[10px] opacity-70 truncate">
                            {service?.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
