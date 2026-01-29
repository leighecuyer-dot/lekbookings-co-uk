import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock, GripVertical } from "lucide-react";
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
}

interface WeekViewProps {
  selectedDate: Date;
  bookings: Booking[];
  services: Service[];
  onBookingClick: (booking: Booking) => void;
  // Drag and drop props
  onDragStart?: (e: React.DragEvent, booking: Booking) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetDate: Date, targetTime: string) => void;
  draggingBookingId?: string | null;
}

export function WeekView({ 
  selectedDate, 
  bookings, 
  services, 
  onBookingClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggingBookingId,
}: WeekViewProps) {
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

                const timeSlot = `${hour.toString().padStart(2, "0")}:00`;

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-r p-1 min-h-[80px] transition-colors",
                      draggingBookingId && "hover:bg-primary/10"
                    )}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop?.(e, day, timeSlot)}
                  >
                    {dayBookings.map((booking) => {
                      const service = services.find(
                        (s) => s.id === booking.service_id
                      );
                      const isDragging = draggingBookingId === booking.id;
                      
                      return (
                        <div
                          key={booking.id}
                          draggable
                          onDragStart={(e) => onDragStart?.(e, booking)}
                          onDragEnd={onDragEnd}
                          onClick={() => onBookingClick(booking)}
                          className={cn(
                            `p-2 rounded-lg cursor-grab active:cursor-grabbing text-xs mb-1 ${getStatusColor(
                              booking.status
                            )} hover:scale-[1.02] transition-all`,
                            isDragging && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <GripVertical className="w-3 h-3 opacity-40" />
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
                    {/* Drop zone indicator when dragging */}
                    {draggingBookingId && dayBookings.length === 0 && (
                      <div className="h-full min-h-[60px] border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center">
                        <span className="text-[10px] text-primary/50">Drop here</span>
                      </div>
                    )}
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
