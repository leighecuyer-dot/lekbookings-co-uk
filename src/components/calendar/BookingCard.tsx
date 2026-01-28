import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Clock, User, ChevronRight, ChevronLeft, XCircle } from "lucide-react";
import { StatusConfigItem } from "@/hooks/useKanbanSettings";

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

interface BookingCardProps {
  booking: Booking;
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, newStatus: string) => void;
  statusConfig: StatusConfigItem[];
  compact?: boolean;
  showActions?: boolean;
  isUpdating?: boolean;
  effectiveStatus?: string;
}

export function BookingCard({
  booking,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
  statusConfig,
  compact = false,
  showActions = false,
  isUpdating = false,
  effectiveStatus,
}: BookingCardProps) {
  const service = services.find((s) => s.id === booking.service_id);
  const staff = staffList.find((s) => s.id === booking.staff_id);
  const currentStatus = effectiveStatus || booking.status;

  const getNextStatus = (status: string) => {
    if (status === "pending") return "confirmed";
    if (status === "confirmed") return "completed";
    return null;
  };

  const getPrevStatus = (status: string) => {
    if (status === "confirmed") return "pending";
    if (status === "completed") return "confirmed";
    return null;
  };

  const nextStatus = getNextStatus(currentStatus);
  const prevStatus = getPrevStatus(currentStatus);
  const nextStatusConfig = nextStatus ? statusConfig.find(s => s.id === nextStatus) : null;
  const prevStatusConfig = prevStatus ? statusConfig.find(s => s.id === prevStatus) : null;

  return (
    <div
      className={`rounded-xl bg-background border-2 border-border overflow-hidden transition-shadow hover:shadow-md ${
        compact ? "p-3" : "p-4"
      } ${isUpdating ? "opacity-70" : ""}`}
    >
      {/* Main Content - Clickable */}
      <div 
        onClick={() => onBookingClick(booking)}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`font-bold truncate ${compact ? "text-sm" : "text-base"}`}>
              {booking.customer_name || "Walk-in"}
            </p>
            <p className={`text-muted-foreground truncate ${compact ? "text-xs" : "text-sm"}`}>
              {service?.name || "No service"}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 mt-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          <span className="flex items-center gap-1">
            <Clock className={compact ? "w-3 h-3" : "w-4 h-4"} />
            {format(parseISO(booking.start_time), compact ? "HH:mm" : "MMM d, HH:mm")}
          </span>
          {staff && (
            <span className="flex items-center gap-1">
              <User className={compact ? "w-3 h-3" : "w-4 h-4"} />
              {staff.name}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions - Mobile only */}
      {showActions && currentStatus !== "cancelled" && (nextStatus || prevStatus) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          {prevStatus && prevStatusConfig && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(booking.id, prevStatus);
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {prevStatusConfig.label}
            </Button>
          )}
          {nextStatus && nextStatusConfig && (
            <Button
              size="sm"
              className={`flex-1 h-9 ${nextStatusConfig.bgColor} ${nextStatusConfig.textColor} hover:opacity-90 border-2 ${nextStatusConfig.borderColor}`}
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(booking.id, nextStatus);
              }}
            >
              {nextStatusConfig.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Cancel option for active bookings */}
      {showActions && currentStatus !== "cancelled" && currentStatus !== "completed" && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={isUpdating}
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(booking.id, "cancelled");
          }}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Cancel booking
        </Button>
      )}
    </div>
  );
}
