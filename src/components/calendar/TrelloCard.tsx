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
  color?: string | null;
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

// Default label colors for services without a color
const defaultLabelColors = [
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-black" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
];

// Simple hash function to get consistent color for service
function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % defaultLabelColors.length;
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
  
  // Get label color - use service color if available, otherwise hash-based default
  const getLabelStyle = () => {
    if (service?.color) {
      return {
        backgroundColor: service.color,
        color: isLightColor(service.color) ? '#000' : '#fff',
      };
    }
    return null;
  };

  const labelStyle = getLabelStyle();
  const defaultColor = service ? defaultLabelColors[getColorIndex(service.id)] : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("bookingId", booking.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onBookingClick(booking)}
      className={`group bg-card rounded-lg shadow-sm border border-border cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
        isDragging ? "opacity-50 rotate-2 scale-105" : ""
      }`}
    >
      {/* Service Label - Trello style colored bar at top */}
      {service && (
        <div className="px-2 pt-2">
          <div 
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide truncate max-w-full ${
              !labelStyle ? `${defaultColor?.bg} ${defaultColor?.text}` : ""
            }`}
            style={labelStyle || undefined}
            title={service.name}
          >
            {service.name}
          </div>
        </div>
      )}
      
      <div className="p-2 pt-1.5">
        {/* Drag Handle + Content */}
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            {/* Customer Name */}
            <p className="font-semibold text-sm truncate text-foreground">
              {booking.customer_name || "Walk-in"}
            </p>
            
            {/* Time & Staff */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
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
    </div>
  );
}

// Helper to determine if a color is light (for text contrast)
function isLightColor(color: string): boolean {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  // Handle rgb/rgba
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  return false;
}
