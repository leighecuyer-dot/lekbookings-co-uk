import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Check } from "lucide-react";
import { StatusConfigItem, colorPresets } from "@/hooks/useKanbanSettings";
import { BookingCard } from "./BookingCard";

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

interface KanbanColumnProps {
  column: StatusConfigItem;
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  statusConfig: StatusConfigItem[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, newStatus: string) => void;
  onLabelUpdate: (statusId: string, newLabel: string) => Promise<boolean>;
  onColorUpdate: (statusId: string, colorId: string) => Promise<boolean>;
  getEffectiveStatus: (booking: { id: string; status: string }) => string;
  isUpdating: (bookingId: string) => boolean;
}

export function KanbanColumn({
  column,
  bookings,
  services,
  staffList,
  statusConfig,
  onBookingClick,
  onStatusChange,
  onLabelUpdate,
  onColorUpdate,
  getEffectiveStatus,
  isUpdating,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const StatusIcon = column.icon;

  const handleEditStart = () => {
    setIsEditing(true);
    setEditValue(column.label);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    await onLabelUpdate(column.id, editValue);
    setIsEditing(false);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) {
        if (e.key === "Enter") handleEditSave();
        if (e.key === "Escape") handleEditCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, editValue]);

  // Filter bookings by effective status (to handle optimistic updates)
  const columnBookings = bookings.filter(b => getEffectiveStatus(b) === column.id);

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className={`p-4 rounded-t-xl border-2 ${column.borderColor} ${column.bgColor}`}>
        <div className="flex items-center gap-2">
          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 rounded hover:bg-background/50 transition-colors">
                <StatusIcon className={`w-5 h-5 ${column.textColor}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Pick a color</p>
                <div className="grid grid-cols-4 gap-1">
                  {colorPresets.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => onColorUpdate(column.id, color.id)}
                      className={`w-8 h-8 rounded-lg ${color.bgColor} ${color.borderColor} border-2 transition-transform hover:scale-110 ${
                        column.colorId === color.id ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-sm font-bold bg-background"
                onBlur={handleEditSave}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleEditSave}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={handleEditStart}
              className={`font-bold ${column.textColor} hover:underline flex items-center gap-1 group`}
            >
              {column.label}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
            </button>
          )}
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
              statusConfig={statusConfig}
              effectiveStatus={getEffectiveStatus(booking)}
              isUpdating={isUpdating(booking.id)}
              compact
            />
          ))
        )}
      </div>
    </div>
  );
}
