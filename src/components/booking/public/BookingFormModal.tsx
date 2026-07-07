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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay, endOfDay } from "date-fns";
import { Clock, CheckCircle, User, Users } from "lucide-react";
import { WaitlistDialog } from "@/components/waitlist/WaitlistDialog";
import { isValidEmail } from "@/lib/validation";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

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

interface StaffLeave {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
}

interface BookingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  service: Service;
  primaryColor: string;
}

interface SavedCustomerDetails {
  name: string;
  email: string;
  phone: string;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00"
];

const STORAGE_KEY = "booking_customer_details";

const getSavedDetails = (): SavedCustomerDetails | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveDetails = (details: SavedCustomerDetails) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
  } catch {
    // Silently fail if localStorage is not available
  }
};

const clearSavedDetails = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
};

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
  const [staffLeave, setStaffLeave] = useState<StaffLeave[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rememberDetails, setRememberDetails] = useState(false);
  const [hasSavedDetails, setHasSavedDetails] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    requireDeposit: boolean;
    depositType: "percentage" | "fixed";
    depositAmount: number;
  } | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
  const [waitlistSlot, setWaitlistSlot] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (open && businessId) {
      fetchStaff();
      fetchStaffLeave();
      fetchPaymentConfig();
      // Load saved customer details
      const saved = getSavedDetails();
      if (saved) {
        setFormData(prev => ({
          ...prev,
          name: saved.name,
          email: saved.email,
          phone: saved.phone,
        }));
        setHasSavedDetails(true);
        setRememberDetails(true);
      }
    }
    if (!open) {
      // Reset on close
      setStep("date");
      setSelectedDate(undefined);
      setSelectedTime(null);
      setSelectedStaff(null);
      setHasSavedDetails(false);
      setExistingBookings([]);
      setWaitlistDialogOpen(false);
      setWaitlistSlot(null);
      // Only reset form if no saved details
      const saved = getSavedDetails();
      if (saved) {
        setFormData({ name: saved.name, email: saved.email, phone: saved.phone, notes: "" });
        setRememberDetails(true);
      } else {
        setFormData({ name: "", email: "", phone: "", notes: "" });
        setRememberDetails(false);
      }
    }
  }, [open, businessId]);

  // Fetch existing bookings when date changes
  useEffect(() => {
    if (selectedDate && businessId) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate, businessId]);

  const fetchBookingsForDate = async (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const { data } = await supabase
      .from("bookings")
      .select("id, start_time, end_time, status")
      .eq("business_id", businessId)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .neq("status", "cancelled");
    
    if (data) {
      setExistingBookings(data);
    }
  };

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

  const fetchStaffLeave = async () => {
    const { data } = await supabase
      .from("staff_leave")
      .select("id, staff_id, start_date, end_date")
      .eq("business_id", businessId);
    
    if (data) {
      setStaffLeave(data);
    }
  };

  const isStaffOnLeave = (staffId: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return staffLeave.some(
      (leave) =>
        leave.staff_id === staffId &&
        leave.start_date <= dateStr &&
        leave.end_date >= dateStr
    );
  };

  const fetchPaymentConfig = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("settings")
      .eq("id", businessId)
      .single();
    
    if (data?.settings) {
      const settings = data.settings as Record<string, unknown>;
      const config = settings.paymentConfig as {
        requireDeposit: boolean;
        depositType: "percentage" | "fixed";
        depositAmount: number;
      } | undefined;
      if (config) {
        setPaymentConfig(config);
      }
    }
  };

  const getAvailableSlots = () => {
    if (!selectedDate || !selectedStaff) return TIME_SLOTS;
    
    // Check if selected staff is on leave for this date
    if (isStaffOnLeave(selectedStaff, selectedDate)) {
      return [];
    }
    
    const dayName = format(selectedDate, "EEEE").toLowerCase();
    const staffMember = staff.find(s => s.id === selectedStaff);
    
    if (!staffMember?.working_hours) return TIME_SLOTS;
    
    const dayHours = staffMember.working_hours[dayName];
    if (!dayHours?.enabled) return [];
    
    return TIME_SLOTS.filter(slot => {
      return slot >= dayHours.start && slot < dayHours.end;
    });
  };

  // Check if a time slot is already booked
  const isSlotBooked = (slot: string): boolean => {
    if (!selectedDate) return false;
    
    const [hours, minutes] = slot.split(":").map(Number);
    const slotStart = setMinutes(setHours(selectedDate, hours), minutes);
    const slotEnd = new Date(slotStart.getTime() + service.duration_minutes * 60000);
    
    return existingBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      // Check for overlap
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  // Get available staff for a given date (not on leave)
  const getAvailableStaff = () => {
    if (!selectedDate) return staff;
    return staff.filter(s => !isStaffOnLeave(s.id, selectedDate));
  };

  const handleJoinWaitlist = (slot: string) => {
    setWaitlistSlot(slot);
    setWaitlistDialogOpen(true);
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

    // Calculate deposit amount if configured
    const totalPrice = service.price || 0;
    let depositAmount: number | null = null;
    
    if (paymentConfig?.requireDeposit && totalPrice > 0) {
      if (paymentConfig.depositType === "percentage") {
        depositAmount = (totalPrice * paymentConfig.depositAmount) / 100;
      } else {
        depositAmount = paymentConfig.depositAmount;
      }
    }

    const { data: created, error } = await supabase.from("bookings").insert({
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
      total_price: totalPrice > 0 ? totalPrice : null,
      deposit_amount: depositAmount,
      payment_status: "unpaid",
    }).select("id").single();

    if (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking. Please try again.");
    } else {
      // Save or clear customer details based on checkbox
      if (rememberDetails) {
        saveDetails({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
      } else {
        clearSavedDetails();
      }
      
      setStep("success");
      // Trigger email notification (fire and forget). Only bookingId is sent —
      // the edge function looks up the verified customer email server-side.
      if (created?.id) {
        try {
          await supabase.functions.invoke("send-booking-confirmation", {
            body: { bookingId: created.id },
          });
        } catch (e) {
          console.log("Email notification skipped:", e);
        }
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
                if (date) {
                  // Auto-select first available staff member (not on leave)
                  const availableStaff = staff.filter(s => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return !staffLeave.some(
                      leave =>
                        leave.staff_id === s.id &&
                        leave.start_date <= dateStr &&
                        leave.end_date >= dateStr
                    );
                  });
                  if (availableStaff.length > 0 && selectedStaff) {
                    const currentStaffOnLeave = staffLeave.some(
                      leave =>
                        leave.staff_id === selectedStaff &&
                        leave.start_date <= format(date, "yyyy-MM-dd") &&
                        leave.end_date >= format(date, "yyyy-MM-dd")
                    );
                    if (currentStaffOnLeave) {
                      setSelectedStaff(availableStaff[0].id);
                    }
                  }
                  setStep("time");
                }
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
                  {staff.map((s) => {
                    const onLeave = selectedDate ? isStaffOnLeave(s.id, selectedDate) : false;
                    return (
                      <Button
                        key={s.id}
                        variant={selectedStaff === s.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => !onLeave && setSelectedStaff(s.id)}
                        disabled={onLeave}
                        style={selectedStaff === s.id ? { backgroundColor: primaryColor } : {}}
                        className={onLeave ? "opacity-50" : ""}
                      >
                        {s.name}
                        {onLeave && " (On Leave)"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No available times for this day. Please select another date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot) => {
                  const booked = isSlotBooked(slot);
                  return (
                    <div key={slot} className="relative">
                      <Button
                        variant={selectedTime === slot ? "default" : booked ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (booked) {
                            handleJoinWaitlist(slot);
                          } else {
                            setSelectedTime(slot);
                            setStep("details");
                          }
                        }}
                        style={selectedTime === slot ? { backgroundColor: primaryColor } : {}}
                        className={`justify-center w-full ${booked ? "opacity-60" : ""}`}
                      >
                        {booked ? (
                          <Users className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {slot}
                      </Button>
                      {booked && (
                        <span className="absolute -top-1 -right-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">
                          Waitlist
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {existingBookings.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                <Users className="w-3 h-3 inline mr-1" />
                Booked slots can be joined on the waitlist
              </p>
            )}

            <Button variant="ghost" onClick={() => setStep("date")} className="w-full">
              ← Back to calendar
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {hasSavedDetails && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Welcome back! Your details have been pre-filled.</span>
              </div>
            )}
            
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

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="remember"
                checked={rememberDetails}
                onCheckedChange={(checked) => setRememberDetails(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember my details for future bookings
              </Label>
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

      {/* Waitlist Dialog */}
      {selectedDate && waitlistSlot && (
        <WaitlistDialog
          open={waitlistDialogOpen}
          onOpenChange={setWaitlistDialogOpen}
          businessId={businessId}
          service={service}
          selectedDate={selectedDate}
          selectedTime={waitlistSlot}
          staffId={selectedStaff}
          primaryColor={primaryColor}
        />
      )}
    </Dialog>
  );
}
