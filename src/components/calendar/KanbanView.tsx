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
    <div className="hidden md:grid md:grid-cols-4 gap-4 min-h-[500px]">
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
                onStatusChange={handleStatusChange}
                statusConfig={statusConfig}
                effectiveStatus={getEffectiveStatus(booking)}
                isUpdating={isUpdating(booking.id)}
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
