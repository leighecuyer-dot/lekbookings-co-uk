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
  staff_id: string | null;
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
  on_leave?: boolean;
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

const DEFAULT_WORKING_HOURS = { enabled: true, start: "09:00", end: "17:00" };

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
  const [step, setStep] = useState<"date" | "staff" | "time" | "details" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
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
  const [confirmation, setConfirmation] = useState<{ reference: string; emailSent: boolean; smsSent: boolean } | null>(null);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (open && businessId) {
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
      fetchAvailabilityForDate(selectedDate);
    }
  }, [selectedDate, businessId, service.id]);

  const fetchAvailabilityForDate = async (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    setAvailabilityLoading(true);

    const { data, error } = await supabase.rpc("get_public_booking_availability", {
      p_business_id: businessId,
      p_service_id: service.id,
      p_day_start: dayStart.toISOString(),
      p_day_end: dayEnd.toISOString(),
    });

    setAvailabilityLoading(false);

    if (error) {
      console.error("Availability error:", error);
      setStaff([]);
      setExistingBookings([]);
      toast.error("Could not load availability. Please try another date.");
      return;
    }

    const availability = data as { staff?: Staff[]; bookings?: Booking[] } | null;
    const nextStaff = availability?.staff ?? [];
    setStaff(nextStaff);
    setExistingBookings(availability?.bookings ?? []);

    if (selectedStaff && !nextStaff.some((member) => member.id === selectedStaff)) {
      setSelectedStaff(null);
    }
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

  const parseTimeOnDate = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return setMinutes(setHours(date, hours), minutes);
  };

  const formatSlot = (date: Date) => format(date, "HH:mm");

  const getStaffHoursForDate = (staffMember: Staff) => {
    if (!selectedDate || staffMember.on_leave) return null;
    const dayName = format(selectedDate, "EEEE").toLowerCase();
    const dayHours = staffMember.working_hours?.[dayName] ?? DEFAULT_WORKING_HOURS;
    return dayHours?.enabled ? dayHours : null;
  };

  const getWorkingSlotsForStaff = (staffId: string) => {
    if (!selectedDate) return [];
    const staffMember = staff.find((s) => s.id === staffId);
    if (!staffMember) return [];
    const hours = getStaffHoursForDate(staffMember);
    if (!hours) return [];

    const slots: string[] = [];
    let cursor = parseTimeOnDate(selectedDate, hours.start);
    const workingEnd = parseTimeOnDate(selectedDate, hours.end);

    while (cursor.getTime() + service.duration_minutes * 60000 <= workingEnd.getTime()) {
      slots.push(formatSlot(cursor));
      cursor = new Date(cursor.getTime() + 30 * 60000);
    }

    return slots;
  };

  const getAvailableSlots = () => {
    if (!selectedStaff) return [];
    return getWorkingSlotsForStaff(selectedStaff);
  };

  // Check if a time slot is already booked
  const isSlotBooked = (slot: string, staffId = selectedStaff): boolean => {
    if (!selectedDate || !staffId) return false;

    const slotStart = parseTimeOnDate(selectedDate, slot);
    const slotEnd = new Date(slotStart.getTime() + service.duration_minutes * 60000);

    return existingBookings.some(booking => {
      if (booking.staff_id && booking.staff_id !== staffId) return false;
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      // Check for overlap
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  const hasAvailableSlot = (staffId: string) => {
    return getWorkingSlotsForStaff(staffId).some((slot) => !isSlotBooked(slot, staffId));
  };

  const getAvailableStaff = () => {
    return staff.filter((s) => !s.on_leave && hasAvailableSlot(s.id));
  };

  const selectedStaffName = staff.find((member) => member.id === selectedStaff)?.name;

  const handleJoinWaitlist = (slot: string) => {
    setWaitlistSlot(slot);
    setWaitlistDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedStaff || !selectedTime || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    setConfirmation(null);

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

    // Generate booking id client-side because the anon SELECT RLS policy on
    // bookings prevents `.select().single()` from returning the inserted row
    // (which would otherwise cause a false "Failed to create booking" error).
    const bookingId = crypto.randomUUID();
    const reference = bookingId.slice(0, 8).toUpperCase();

    const { error } = await supabase.from("bookings").insert({
      id: bookingId,
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
    });

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
      setConfirmation({ reference, emailSent: false, smsSent: false });
      setConfirmationLoading(true);

      // Trigger confirmation email + SMS (edge function looks up verified
      // customer data server-side and handles opt-in / tier caps).
      try {
        const { data, error: fnErr } = await supabase.functions.invoke<{
          emailSent?: boolean;
          smsSent?: boolean;
        }>("send-booking-confirmation", { body: { bookingId } });
        if (!fnErr && data) {
          setConfirmation({
            reference,
            emailSent: !!data.emailSent,
            smsSent: !!data.smsSent,
          });
        }
      } catch (e) {
        console.log("Confirmation notification skipped:", e);
      } finally {
        setConfirmationLoading(false);
      }
    }
    setSubmitting(false);
  };

  const availableSlots = getAvailableSlots();
  const availableStaff = getAvailableStaff();

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
              {step === "staff" && "Choose who you would like to book with"}
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
                  setSelectedStaff(null);
                  setSelectedTime(null);
                  setStep("staff");
                }
              }}
              disabled={(date) => isBefore(date, startOfDay(new Date())) || isBefore(date, addDays(new Date(), -1))}
              className="rounded-md border mx-auto"
            />
          </div>
        )}

        {step === "staff" && (
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </div>

            {availabilityLoading ? (
              <p className="text-center text-muted-foreground py-6">Checking availability...</p>
            ) : availableStaff.length === 0 ? (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground py-4">
                  No staff have available times for this service on this day. Please select another date.
                </p>
                <Button variant="outline" onClick={() => setStep("date")} className="w-full">
                  ← Back to calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2">
                  {availableStaff.map((member) => (
                    <Button
                      key={member.id}
                      variant="outline"
                      onClick={() => {
                        setSelectedStaff(member.id);
                        setSelectedTime(null);
                        setStep("time");
                      }}
                      className="justify-start h-12"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {member.name}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setStep("date")} className="w-full">
                  ← Back to calendar
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "time" && (
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
              {selectedStaffName && <span className="block">with {selectedStaffName}</span>}
            </div>

            {availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No available times for this staff member. Please choose another person or date.
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

            <Button variant="ghost" onClick={() => setStep("staff")} className="w-full">
              ← Back to staff
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
              {selectedStaffName && <span className="block">with {selectedStaffName}</span>}
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
                aria-invalid={!!formData.email && !isValidEmail(formData.email)}
              />
              {formData.email && !isValidEmail(formData.email) && (
                <p className="text-xs text-destructive">Please enter a valid email address</p>
              )}
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
                disabled={submitting || !formData.name || (!!formData.email && !isValidEmail(formData.email))}
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
              {selectedStaffName && <p className="text-sm text-muted-foreground">with {selectedStaffName}</p>}
            </div>
            {confirmation && (
              <div className="space-y-2">
                <div className="mx-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Reference</span>
                  <span className="font-mono font-semibold text-foreground">{confirmation.reference}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(confirmation.reference);
                      toast.success("Reference copied");
                    }}
                    className="text-xs underline text-muted-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {confirmation.emailSent && confirmation.smsSent
                    ? "Confirmation sent to your email and phone."
                    : confirmation.smsSent
                    ? "Confirmation sent to your phone."
                    : confirmation.emailSent
                    ? "Confirmation sent to your email. SMS will be added once the sender is ready."
                    : "Please save this reference — we couldn't send an automatic confirmation."}
                </p>
              </div>
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
