import { format, parseISO } from "date-fns";
import { Clock, User, GripVertical } from "lucide-react";

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

interface Staff {
  id: string;
  name: string;
}

interface TrelloCardProps {
  booking: Booking;
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  isDragging?: boolean;
}

export function TrelloCard({
  booking,
  services,
  staffList,
  onBookingClick,
  isDragging = false,
}: TrelloCardProps) {
  const service = services.find((s) => s.id === booking.service_id);
  const staff = staffList.find((s) => s.id === booking.staff_id);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("bookingId", booking.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onBookingClick(booking)}
      className={`group bg-card rounded-lg shadow-sm border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
        isDragging ? "opacity-50 rotate-2 scale-105" : ""
      }`}
    >
      {/* Drag Handle */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          {/* Customer Name */}
          <p className="font-semibold text-sm truncate text-foreground">
            {booking.customer_name || "Walk-in"}
          </p>
          
          {/* Service */}
          {service && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {service.name}
            </p>
          )}
          
          {/* Time & Staff */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(booking.start_time), "MMM d, HH:mm")}
            </span>
            {staff && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {staff.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
