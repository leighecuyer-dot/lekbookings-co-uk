import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
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

interface KanbanViewProps {
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, newStatus: string) => void;
}

const statusColumns = [
  { id: "pending", label: "Pending", color: "bg-muted-foreground" },
  { id: "confirmed", label: "Confirmed", color: "bg-foreground" },
  { id: "completed", label: "Completed", color: "bg-muted" },
  { id: "cancelled", label: "Cancelled", color: "bg-destructive/50" },
];

export function KanbanView({
  bookings,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
}: KanbanViewProps) {
  const getBookingsByStatus = (status: string) => {
    return bookings.filter((b) => b.status === status);
  };

  const handleDragStart = (e: React.DragEvent, bookingId: string) => {
    e.dataTransfer.setData("bookingId", bookingId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData("bookingId");
    if (bookingId) {
      onStatusChange(bookingId, status);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[500px]">
      {statusColumns.map((column) => {
        const columnBookings = getBookingsByStatus(column.id);

        return (
          <div
            key={column.id}
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div
              className={`p-3 rounded-t-xl ${column.color} ${
                column.id === "confirmed" || column.id === "pending"
                  ? "text-background"
                  : "text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{column.label}</h3>
                <Badge variant="outline" className="bg-background/20 border-0">
                  {columnBookings.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 bg-muted/30 rounded-b-xl p-3 space-y-3">
              {columnBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No bookings
                </div>
              ) : (
                columnBookings.map((booking) => {
                  const service = services.find((s) => s.id === booking.service_id);
                  const staff = staffList.find((s) => s.id === booking.staff_id);

                  return (
                    <div
                      key={booking.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, booking.id)}
                      onClick={() => onBookingClick(booking)}
                      className="p-3 rounded-xl bg-background border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {booking.customer_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {service?.name || "No service"}
                          </p>
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
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
