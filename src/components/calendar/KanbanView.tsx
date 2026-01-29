import { useKanbanSettings } from "@/hooks/kanban";
import { useBookingActions } from "@/hooks/bookings";
import { TrelloColumn } from "./TrelloColumn";
import { KanbanSkeleton } from "@/components/common/Skeletons";

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
  const { statusConfig, updateLabel, updateColor } = useKanbanSettings();
  const { getEffectiveStatus, updateStatus } = useBookingActions({});

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
    return <KanbanSkeleton />;
  }

  return (
    <div className="h-full flex gap-4 overflow-x-auto pb-4 px-1">
      {statusConfig.map((column) => (
        <TrelloColumn
          key={column.id}
          column={column}
          bookings={getBookingsByStatus(column.id)}
          services={services}
          staffList={staffList}
          onBookingClick={onBookingClick}
          onStatusChange={handleStatusChange}
          onLabelUpdate={updateLabel}
          onColorUpdate={updateColor}
        />
      ))}
    </div>
  );
}
