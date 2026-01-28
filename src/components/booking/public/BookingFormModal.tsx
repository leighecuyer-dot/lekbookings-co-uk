import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { Clock, CheckCircle } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
}

interface Staff {
  id: string;
  name: string;
  working_hours: Record<string, { enabled: boolean; start: string; end: string }> | null;
}

interface BookingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  service: Service;
  primaryColor: string;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00"
];

export function BookingFormModal({
  open,
  onOpenChange,
  businessId,
  service,
  primaryColor,
}: BookingFormModalProps) {
  const [step, setStep] = useState<"date" | "time" | "details" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (open && businessId) {
      fetchStaff();
    }
    if (!open) {
      // Reset on close
      setStep("date");
      setSelectedDate(undefined);
      setSelectedTime(null);
      setSelectedStaff(null);
      setFormData({ name: "", email: "", phone: "", notes: "" });
    }
  }, [open, businessId]);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("id, name, working_hours")
      .eq("business_id", businessId)
      .eq("is_active", true);
    
    if (data && data.length > 0) {
      setStaff(data as Staff[]);
      setSelectedStaff(data[0].id);
    }
  };

  const getAvailableSlots = () => {
    if (!selectedDate || !selectedStaff) return TIME_SLOTS;
    
    const dayName = format(selectedDate, "EEEE").toLowerCase();
    const staffMember = staff.find(s => s.id === selectedStaff);
    
    if (!staffMember?.working_hours) return TIME_SLOTS;
    
    const dayHours = staffMember.working_hours[dayName];
    if (!dayHours?.enabled) return [];
    
    return TIME_SLOTS.filter(slot => {
      return slot >= dayHours.start && slot < dayHours.end;
    });
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    const { error } = await supabase.from("bookings").insert({
      business_id: businessId,
      service_id: service.id,
      staff_id: selectedStaff,
      customer_name: formData.name,
      customer_email: formData.email || null,
      customer_phone: formData.phone || null,
      notes: formData.notes || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "pending",
    });

    if (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking. Please try again.");
    } else {
      setStep("success");
      // Trigger email notification (fire and forget)
      try {
        await supabase.functions.invoke("send-booking-confirmation", {
          body: {
            email: formData.email,
            customerName: formData.name,
            serviceName: service.name,
            dateTime: format(startTime, "EEEE, MMMM d 'at' h:mm a"),
          },
        });
      } catch (e) {
        // Email is optional, don't block on failure
        console.log("Email notification skipped:", e);
      }
    }
    setSubmitting(false);
  };

  const availableSlots = getAvailableSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: primaryColor }}>
            {step === "success" ? "Booking Confirmed!" : `Book ${service.name}`}
          </DialogTitle>
          {step !== "success" && (
            <DialogDescription>
              {step === "date" && "Select a date for your appointment"}
              {step === "time" && "Choose your preferred time"}
              {step === "details" && "Enter your contact information"}
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "date" && (
          <div className="py-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) setStep("time");
              }}
              disabled={(date) => isBefore(date, startOfDay(new Date())) || isBefore(date, addDays(new Date(), -1))}
              className="rounded-md border mx-auto"
            />
          </div>
        )}

        {step === "time" && (
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </div>
            
            {staff.length > 1 && (
              <div className="space-y-2">
                <Label>Select Staff</Label>
                <div className="flex flex-wrap gap-2">
                  {staff.map((s) => (
                    <Button
                      key={s.id}
                      variant={selectedStaff === s.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStaff(s.id)}
                      style={selectedStaff === s.id ? { backgroundColor: primaryColor } : {}}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No available times for this day. Please select another date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedTime(slot);
                      setStep("details");
                    }}
                    style={selectedTime === slot ? { backgroundColor: primaryColor } : {}}
                    className="justify-center"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {slot}
                  </Button>
                ))}
              </div>
            )}

            <Button variant="ghost" onClick={() => setStep("date")} className="w-full">
              ← Back to calendar
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requests..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("time")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.name}
                className="flex-1"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="font-medium text-foreground">Your booking is confirmed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
              </p>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
            {formData.email && (
              <p className="text-xs text-muted-foreground">
                A confirmation email has been sent to {formData.email}
              </p>
            )}
            <Button onClick={() => onOpenChange(false)} style={{ backgroundColor: primaryColor }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
