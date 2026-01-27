import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  CircleDot, 
  Calendar,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

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

const statusConfig = [
  { 
    id: "pending", 
    label: "Pending", 
    icon: CircleDot,
    description: "Awaiting confirmation",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700"
  },
  { 
    id: "confirmed", 
    label: "Confirmed", 
    icon: CheckCircle2,
    description: "Ready to go",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700"
  },
  { 
    id: "completed", 
    label: "Done", 
    icon: CheckCircle2,
    description: "Finished",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-border"
  },
  { 
    id: "cancelled", 
    label: "Cancelled", 
    icon: XCircle,
    description: "Not happening",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700"
  },
];

export function KanbanView({
  bookings,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
}: KanbanViewProps) {
  const [activeTab, setActiveTab] = useState("pending");

  const getBookingsByStatus = (status: string) => {
    return bookings.filter((b) => b.status === status);
  };

  const getNextStatus = (currentStatus: string) => {
    const order = ["pending", "confirmed", "completed"];
    const currentIndex = order.indexOf(currentStatus);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  };

  const getPrevStatus = (currentStatus: string) => {
    const order = ["pending", "confirmed", "completed"];
    const currentIndex = order.indexOf(currentStatus);
    if (currentIndex > 0) {
      return order[currentIndex - 1];
    }
    return null;
  };

  const getStatusConfig = (statusId: string) => {
    return statusConfig.find(s => s.id === statusId) || statusConfig[0];
  };

  // Desktop: 4-column grid layout
  const DesktopView = () => (
    <div className="hidden md:grid md:grid-cols-4 gap-4 min-h-[500px]">
      {statusConfig.map((column) => {
        const columnBookings = getBookingsByStatus(column.id);
        const StatusIcon = column.icon;

        return (
          <div key={column.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`p-4 rounded-t-xl border-2 ${column.borderColor} ${column.bgColor}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${column.textColor}`} />
                <h3 className={`font-bold ${column.textColor}`}>{column.label}</h3>
                <Badge variant="outline" className="ml-auto bg-background">
                  {columnBookings.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 bg-muted/20 rounded-b-xl border-2 border-t-0 border-border p-3 space-y-3">
              {columnBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No bookings here
                </div>
              ) : (
                columnBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    services={services}
                    staffList={staffList}
                    onBookingClick={onBookingClick}
                    onStatusChange={onStatusChange}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Mobile: Tab-based layout with swipe actions
  const MobileView = () => {
    const activeConfig = getStatusConfig(activeTab);
    const activeBookings = getBookingsByStatus(activeTab);
    const StatusIcon = activeConfig.icon;

    return (
      <div className="md:hidden">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
          {statusConfig.map((status) => {
            const count = getBookingsByStatus(status.id).length;
            const Icon = status.icon;
            const isActive = activeTab === status.id;

            return (
              <button
                key={status.id}
                onClick={() => setActiveTab(status.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? `${status.bgColor} ${status.textColor} border-2 ${status.borderColor} font-bold`
                    : "bg-muted text-muted-foreground border-2 border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{status.label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Active Tab Header */}
        <div className={`p-4 rounded-xl ${activeConfig.bgColor} border-2 ${activeConfig.borderColor} mb-4`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${activeConfig.textColor}`} />
            <div>
              <h2 className={`font-bold text-lg ${activeConfig.textColor}`}>
                {activeConfig.label}
              </h2>
              <p className={`text-sm ${activeConfig.textColor} opacity-80`}>
                {activeConfig.description}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto bg-background text-lg px-3 py-1">
              {activeBookings.length}
            </Badge>
          </div>
        </div>

        {/* Booking List */}
        <div className="space-y-3">
          {activeBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No bookings here</p>
              <p className="text-sm mt-1">
                {activeTab === "pending" && "New bookings will appear here"}
                {activeTab === "confirmed" && "Confirmed appointments show here"}
                {activeTab === "completed" && "Finished appointments go here"}
                {activeTab === "cancelled" && "Cancelled bookings appear here"}
              </p>
            </div>
          ) : (
            activeBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                services={services}
                staffList={staffList}
                onBookingClick={onBookingClick}
                onStatusChange={onStatusChange}
                showActions
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <DesktopView />
      <MobileView />
    </>
  );
}

// Extracted Booking Card Component
interface BookingCardProps {
  booking: Booking;
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, newStatus: string) => void;
  compact?: boolean;
  showActions?: boolean;
}

function BookingCard({
  booking,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
  compact = false,
  showActions = false,
}: BookingCardProps) {
  const service = services.find((s) => s.id === booking.service_id);
  const staff = staffList.find((s) => s.id === booking.staff_id);
  const statusInfo = statusConfig.find(s => s.id === booking.status) || statusConfig[0];

  const getNextStatus = (currentStatus: string) => {
    if (currentStatus === "pending") return "confirmed";
    if (currentStatus === "confirmed") return "completed";
    return null;
  };

  const getPrevStatus = (currentStatus: string) => {
    if (currentStatus === "confirmed") return "pending";
    if (currentStatus === "completed") return "confirmed";
    return null;
  };

  const nextStatus = getNextStatus(booking.status);
  const prevStatus = getPrevStatus(booking.status);
  const nextStatusConfig = nextStatus ? statusConfig.find(s => s.id === nextStatus) : null;
  const prevStatusConfig = prevStatus ? statusConfig.find(s => s.id === prevStatus) : null;

  return (
    <div
      className={`rounded-xl bg-background border-2 border-border overflow-hidden transition-shadow hover:shadow-md ${
        compact ? "p-3" : "p-4"
      }`}
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
      {showActions && booking.status !== "cancelled" && (nextStatus || prevStatus) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          {prevStatus && prevStatusConfig && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
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
      {showActions && booking.status !== "cancelled" && booking.status !== "completed" && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
