import { useState, useRef, useEffect, DragEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Check, Plus } from "lucide-react";
import { StatusConfigItem, colorPresets } from "@/hooks/kanban";
import { TrelloCard } from "./TrelloCard";

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

interface TrelloColumnProps {
  column: StatusConfigItem;
  bookings: Booking[];
  services: Service[];
  staffList: Staff[];
  onBookingClick: (booking: Booking) => void;
  onStatusChange: (bookingId: string, newStatus: string) => void;
  onLabelUpdate: (statusId: string, newLabel: string) => Promise<boolean>;
  onColorUpdate: (statusId: string, colorId: string) => Promise<boolean>;
}

export function TrelloColumn({
  column,
  bookings,
  services,
  staffList,
  onBookingClick,
  onStatusChange,
  onLabelUpdate,
  onColorUpdate,
}: TrelloColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const StatusIcon = column.icon;

  const handleEditStart = () => {
    setIsEditing(true);
    setEditValue(column.label);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    if (editValue.trim() && editValue !== column.label) {
      await onLabelUpdate(column.id, editValue.trim());
    }
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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const bookingId = e.dataTransfer.getData("bookingId");
    if (bookingId) {
      onStatusChange(bookingId, column.id);
    }
  };

  return (
    <div className="flex flex-col w-72 shrink-0 max-h-full">
      {/* Column Header - Trello style */}
      <div className={`px-3 py-2 rounded-t-xl ${column.bgColor}`}>
        <div className="flex items-center gap-2">
          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 rounded hover:bg-background/30 transition-colors">
                <StatusIcon className={`w-4 h-4 ${column.textColor}`} />
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
              className={`font-bold text-sm ${column.textColor} hover:underline flex items-center gap-1 group flex-1 text-left`}
            >
              {column.label}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
            </button>
          )}
          
          {/* Count Badge */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 ${column.textColor}`}>
            {bookings.length}
          </span>
        </div>
      </div>

      {/* Column Content - Scrollable */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 bg-muted/30 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors ${
          isDragOver ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""
        }`}
      >
        {bookings.length === 0 ? (
          <div className={`text-center py-8 text-muted-foreground text-sm rounded-lg border-2 border-dashed ${
            isDragOver ? "border-primary bg-primary/5" : "border-muted"
          }`}>
            {isDragOver ? "Drop here" : "No bookings"}
          </div>
        ) : (
          bookings.map((booking) => (
            <TrelloCard
              key={booking.id}
              booking={booking}
              services={services}
              staffList={staffList}
              onBookingClick={onBookingClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
