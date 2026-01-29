import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { StatusConfigItem, useKanbanSettings } from "@/hooks/kanban";
import { useBookingActions } from "@/hooks/bookings";
import { BookingCard } from "./BookingCard";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanSkeleton, KanbanMobileSkeleton } from "@/components/common/Skeletons";

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
  loading?: boolean;
}

export function KanbanView({
  bookings,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
  loading = false,
}: KanbanViewProps) {
  const [activeTab, setActiveTab] = useState("pending");
  
  const { statusConfig, updateLabel, updateColor, getStatusConfig } = useKanbanSettings();
  const { getEffectiveStatus, isUpdating, updateStatus } = useBookingActions({});

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    await updateStatus(bookingId, newStatus, booking.status);
    onStatusChange(bookingId, newStatus);
  };

  const getBookingsByStatus = (status: string) => {
    return bookings.filter((b) => getEffectiveStatus(b) === status);
  };

  if (loading) {
    return (
      <>
        <KanbanSkeleton />
        <KanbanMobileSkeleton />
      </>
    );
  }

  // Desktop: 4-column grid layout
  const DesktopView = () => (
    <div className="hidden md:grid md:grid-cols-4 gap-3 h-full overflow-hidden">
      {statusConfig.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          bookings={bookings}
          services={services}
          staffList={staffList}
          statusConfig={statusConfig}
          onBookingClick={onBookingClick}
          onStatusChange={handleStatusChange}
          onLabelUpdate={updateLabel}
          onColorUpdate={updateColor}
          getEffectiveStatus={getEffectiveStatus}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );

  // Mobile: Tab-based layout - compact for single screen
  const MobileView = () => {
    const activeConfig = getStatusConfig(activeTab);
    const activeBookings = getBookingsByStatus(activeTab);
    const StatusIcon = activeConfig.icon;

    return (
      <div className="md:hidden h-full flex flex-col">
        {/* Status Tabs - Compact */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide shrink-0">
          {statusConfig.map((status) => {
            const count = getBookingsByStatus(status.id).length;
            const Icon = status.icon;
            const isActive = activeTab === status.id;

            return (
              <button
                key={status.id}
                onClick={() => setActiveTab(status.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap transition-all text-xs ${
                  isActive
                    ? `${status.bgColor} ${status.textColor} border ${status.borderColor} font-bold`
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{status.label}</span>
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Booking List - Scrollable */}
        <div className="flex-1 overflow-auto space-y-2 mt-2">
          {activeBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-sm">No bookings</p>
            </div>
          ) : (
            activeBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                services={services}
                staffList={staffList}
                onBookingClick={onBookingClick}
                onStatusChange={handleStatusChange}
                statusConfig={statusConfig}
                effectiveStatus={getEffectiveStatus(booking)}
                isUpdating={isUpdating(booking.id)}
                showActions
                compact
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
