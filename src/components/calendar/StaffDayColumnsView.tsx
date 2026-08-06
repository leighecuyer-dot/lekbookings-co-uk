import { format, parseISO, setHours, setMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import {
  TIME_SLOTS,
  DAY_START_MINUTES,
  SLOT_MINUTES,
  getStaffColor,
  isStaffAvailableAtSlot,
  isStaffWorkingToday,
  type DayViewStaff,
} from "./dayViewUtils";

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

interface StaffDayColumnsViewProps {
  selectedDate: Date;
  bookings: Booking[];
  services: Service[];
  staffList: DayViewStaff[];
  onBookingClick: (booking: Booking) => void;
  onSlotClick: (time: string, staffId?: string) => void;
  loading?: boolean;
  isOnLeave?: (staffId: string, date: Date) => boolean;
  onDragStart?: (e: React.DragEvent, booking: Booking) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetDate: Date, targetTime: string, staffId?: string | null) => void;
  draggingBookingId?: string | null;
}

const SLOT_HEIGHT = 52; // px per 30 min
const UNASSIGNED = "__unassigned__";

export function StaffDayColumnsView({
  selectedDate,
  bookings,
  services,
  staffList,
  onBookingClick,
  onSlotClick,
  loading,
  isOnLeave,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggingBookingId,
}: StaffDayColumnsViewProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
    );
  }

  const hasUnassigned = bookings.some((b) => !b.staff_id);
  const columns: { id: string; name: string; staff: DayViewStaff | null }[] = [
    ...staffList.map((s) => ({ id: s.id, name: s.name, staff: s })),
    ...(hasUnassigned ? [{ id: UNASSIGNED, name: "Unassigned", staff: null }] : []),
  ];

  if (columns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No staff members yet
      </div>
    );
  }

  const gridHeight = TIME_SLOTS.length * SLOT_HEIGHT;

  const minutesFromDayStart = (iso: string) => {
    const d = parseISO(iso);
    return differenceInMinutes(d, startOfDay(selectedDate)) - DAY_START_MINUTES;
  };

  const columnBookings = (columnId: string) =>
    bookings.filter((b) =>
      columnId === UNASSIGNED ? !b.staff_id : b.staff_id === columnId
    );

  // Lay out overlapping bookings side by side within a column
  const layoutColumn = (items: Booking[]) => {
    const sorted = [...items].sort(
      (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    );
    const lanes: Booking[][] = [];
    const placement = new Map<string, { lane: number }>();

    sorted.forEach((booking) => {
      const start = parseISO(booking.start_time).getTime();
      let laneIndex = lanes.findIndex(
        (lane) => parseISO(lane[lane.length - 1].end_time).getTime() <= start
      );
      if (laneIndex === -1) {
        lanes.push([booking]);
        laneIndex = lanes.length - 1;
      } else {
        lanes[laneIndex].push(booking);
      }
      placement.set(booking.id, { lane: laneIndex });
    });

    return { sorted, placement, laneCount: Math.max(lanes.length, 1) };
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        {/* Time gutter */}
        <div className="sticky left-0 z-20 bg-background shrink-0 w-12 sm:w-16 border-r">
          <div className="h-12 border-b" />
          <div style={{ height: gridHeight }} className="relative">
            {TIME_SLOTS.map((slot, i) => (
              <div
                key={slot}
                className="absolute left-0 right-0 text-[10px] sm:text-xs text-muted-foreground pl-1"
                style={{ top: i * SLOT_HEIGHT }}
              >
                {slot}
              </div>
            ))}
          </div>
        </div>

        {/* Staff columns */}
        {columns.map((column) => {
          const color = getStaffColor(column.staff ? column.id : null, staffList);
          const items = columnBookings(column.id);
          const { sorted, placement, laneCount } = layoutColumn(items);
          const onLeave = column.staff && isOnLeave?.(column.staff.id, selectedDate);
          const working = column.staff ? isStaffWorkingToday(column.staff, selectedDate) : true;

          return (
            <div key={column.id} className="w-[160px] sm:w-[200px] shrink-0 border-r last:border-r-0">
              {/* Header */}
              <div
                className="h-12 flex items-center justify-center px-2 border-b sticky top-0 z-10"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                <div className="text-center min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{column.name}</p>
                  {(onLeave || !working) && (
                    <p className="text-[10px] opacity-80">{onLeave ? "On leave" : "Off"}</p>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div
                className={cn("relative", (onLeave || !working) && "bg-muted/40")}
                style={{ height: gridHeight }}
              >
                {TIME_SLOTS.map((slot, i) => {
                  const available = column.staff
                    ? isStaffAvailableAtSlot(column.staff, slot, selectedDate, isOnLeave)
                    : true;
                  return (
                    <div
                      key={slot}
                      onClick={() =>
                        available && onSlotClick(slot, column.staff ? column.id : undefined)
                      }
                      onDragOver={onDragOver}
                      onDrop={(e) =>
                        onDrop?.(e, selectedDate, slot, column.staff ? column.id : null)
                      }
                      className={cn(
                        "absolute left-0 right-0 border-b border-dashed border-muted-foreground/15 group",
                        available ? "cursor-pointer hover:bg-primary/5" : "cursor-not-allowed",
                        draggingBookingId && available && "hover:bg-primary/10"
                      )}
                      style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                    >
                      {available && (
                        <Plus className="w-3 h-3 m-1 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors" />
                      )}
                    </div>
                  );
                })}

                {/* Bookings */}
                {sorted.map((booking) => {
                  const startMin = minutesFromDayStart(booking.start_time);
                  const endMin = minutesFromDayStart(booking.end_time);
                  const top = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
                  const height = Math.max(
                    ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT - 3,
                    26
                  );
                  const lane = placement.get(booking.id)?.lane ?? 0;
                  const widthPct = 100 / laneCount;
                  const service = services.find((s) => s.id === booking.service_id);
                  const isDragging = draggingBookingId === booking.id;

                  if (top + height < 0 || top > gridHeight) return null;

                  return (
                    <div
                      key={booking.id}
                      draggable
                      onDragStart={(e) => onDragStart?.(e, booking)}
                      onDragEnd={onDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(booking);
                      }}
                      className={cn(
                        "absolute rounded-lg p-1.5 overflow-hidden cursor-grab active:cursor-grabbing transition-opacity",
                        isDragging && "opacity-50",
                        booking.status === "cancelled" && "opacity-60 line-through"
                      )}
                      style={{
                        top: Math.max(top, 0),
                        height,
                        left: `calc(${lane * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        backgroundColor: color.bg,
                        color: color.text,
                        borderLeft: service?.color ? `4px solid ${service.color}` : undefined,
                      }}
                    >
                      <p className="text-[10px] sm:text-xs font-semibold truncate">
                        {format(parseISO(booking.start_time), "HH:mm")}
                      </p>
                      <p className="text-[11px] sm:text-sm font-medium truncate">
                        {booking.customer_name}
                      </p>
                      <p className="text-[10px] truncate" style={{ opacity: 0.8 }}>
                        {service?.name || "No service"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
