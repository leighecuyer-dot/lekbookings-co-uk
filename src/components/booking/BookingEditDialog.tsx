import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Trash2, Clock, User, Calendar } from "lucide-react";
import { BookingImageUpload } from "./BookingImageUpload";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  service_id: string | null;
  staff_id: string | null;
  image_urls: string[] | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Staff {
  id: string;
  name: string;
}

interface BookingEditDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  staffList: Staff[];
  onUpdate: () => void;
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function BookingEditDialog({
  booking,
  open,
  onOpenChange,
  services,
  staffList,
  onUpdate,
}: BookingEditDialogProps) {
  const [editData, setEditData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    status: "confirmed",
    notes: "",
    serviceId: "",
    staffId: "",
    imageUrls: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setEditData({
        customerName: booking.customer_name || "",
        customerEmail: booking.customer_email || "",
        customerPhone: booking.customer_phone || "",
        status: booking.status,
        notes: booking.notes || "",
        serviceId: booking.service_id || "",
        staffId: booking.staff_id || "",
        imageUrls: booking.image_urls || [],
      });
    }
  }, [booking]);

  const handleUpdate = async () => {
    if (!booking) return;
    setLoading(true);

    const { error } = await supabase
      .from("bookings")
      .update({
        customer_name: editData.customerName,
        customer_email: editData.customerEmail || null,
        customer_phone: editData.customerPhone || null,
        status: editData.status,
        notes: editData.notes || null,
        service_id: editData.serviceId || null,
        staff_id: editData.staffId || null,
        image_urls: editData.imageUrls.length > 0 ? editData.imageUrls : null,
      })
      .eq("id", booking.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update booking");
      return;
    }

    toast.success("Booking updated!");
    onOpenChange(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!booking) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this booking?");
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    setLoading(false);

    if (error) {
      toast.error("Failed to delete booking");
      return;
    }

    toast.success("Booking deleted");
    onOpenChange(false);
    onUpdate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-foreground text-background";
      case "pending":
        return "bg-muted-foreground text-background";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (!booking) return null;

  const service = services.find((s) => s.id === booking.service_id);
  const staff = staffList.find((s) => s.id === booking.staff_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Booking</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(parseISO(booking.start_time), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(parseISO(booking.start_time), "HH:mm")} - {format(parseISO(booking.end_time), "HH:mm")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={editData.status}
              onValueChange={(v) => setEditData({ ...editData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={editData.customerName}
              onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editData.customerEmail}
                onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editData.customerPhone}
                onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Service & Staff */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={editData.serviceId}
                onValueChange={(v) => setEditData({ ...editData, serviceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select
                value={editData.staffId}
                onValueChange={(v) => setEditData({ ...editData, staffId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Photo Attachments */}
          <BookingImageUpload
            images={editData.imageUrls}
            onImagesChange={(urls) => setEditData({ ...editData, imageUrls: urls })}
            bookingId={booking.id}
          />
        </div>

        <DialogFooter className="flex justify-between mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading} className="gradient-primary">
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
