import { format, parseISO } from "date-fns";
import { Clock, GripVertical, DollarSign, User } from "lucide-react";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  service_id: string | null;
  staff_id: string | null;
  payment_status?: string | null;
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

// Payment status badge config
const paymentStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: "bg-red-100", text: "text-red-700", label: "Unpaid" },
  deposit_paid: { bg: "bg-amber-100", text: "text-amber-700", label: "Deposit" },
  paid: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Paid" },
};

// Simple hash function to get consistent color for service
function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % defaultLabelColors.length;
}

// Staff badge colors - rotate through these
const staffColors = [
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
];

export function TrelloCard({
  booking,
  services,
  staffList,
  onBookingClick,
  isDragging = false,
}: TrelloCardProps) {
  const service = services.find((s) => s.id === booking.service_id);
  const staff = staffList.find((s) => s.id === booking.staff_id);
  const paymentStatus = booking.payment_status || "unpaid";
  const paymentConfig = paymentStatusConfig[paymentStatus] || paymentStatusConfig.unpaid;
  
  // Get service label style
  const getServiceLabelStyle = () => {
    if (service?.color) {
      return {
        backgroundColor: service.color,
        color: isLightColor(service.color) ? '#000' : '#fff',
      };
    }
    return null;
  };

  const serviceLabelStyle = getServiceLabelStyle();
  const defaultServiceColor = service ? defaultLabelColors[getColorIndex(service.id)] : null;
  const staffColor = staff ? staffColors[getColorIndex(staff.id) % staffColors.length] : null;

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
      {/* Labels Row - Trello style colored badges at top */}
      <div className="px-2 pt-2 flex flex-wrap gap-1">
        {/* Service Label */}
        {service && (
          <div 
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide truncate max-w-[120px] ${
              !serviceLabelStyle ? `${defaultServiceColor?.bg} ${defaultServiceColor?.text}` : ""
            }`}
            style={serviceLabelStyle || undefined}
            title={service.name}
          >
            {service.name}
          </div>
        )}
        
        {/* Staff Label */}
        {staff && staffColor && (
          <div 
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px] ${staffColor.bg} ${staffColor.text}`}
            title={staff.name}
          >
            <User className="w-2.5 h-2.5" />
            {staff.name.split(' ')[0]}
          </div>
        )}
        
        {/* Payment Status Label */}
        <div 
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentConfig.bg} ${paymentConfig.text}`}
          title={`Payment: ${paymentConfig.label}`}
        >
          <DollarSign className="w-2.5 h-2.5" />
          {paymentConfig.label}
        </div>
      </div>
      
      <div className="p-2 pt-1.5">
        {/* Drag Handle + Content */}
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            {/* Customer Name */}
            <p className="font-semibold text-sm truncate text-foreground">
              {booking.customer_name || "Walk-in"}
            </p>
            
            {/* Time */}
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {format(parseISO(booking.start_time), "MMM d, HH:mm")}
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
