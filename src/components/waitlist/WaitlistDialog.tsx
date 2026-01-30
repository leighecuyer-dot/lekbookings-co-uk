import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, setHours, setMinutes } from "date-fns";
import { Clock, CheckCircle } from "lucide-react";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  service: {
    id: string;
    name: string;
    duration_minutes: number;
  };
  selectedDate: Date;
  selectedTime: string;
  staffId?: string | null;
  primaryColor: string;
}

export function WaitlistDialog({
  open,
  onOpenChange,
  businessId,
  service,
  selectedDate,
  selectedTime,
  staffId,
  primaryColor,
}: WaitlistDialogProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Please enter your name");
      return;
    }

    setSubmitting(true);

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    const { error } = await supabase.from("waitlist").insert({
      business_id: businessId,
      service_id: service.id,
      staff_id: staffId || null,
      customer_name: formData.name,
      customer_email: formData.email || null,
      customer_phone: formData.phone || null,
      desired_date: format(selectedDate, "yyyy-MM-dd"),
      desired_start_time: selectedTime,
      desired_end_time: format(endTime, "HH:mm"),
      status: "waiting",
      notes: formData.notes || null,
    });

    if (error) {
      console.error("Waitlist error:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } else {
      setStep("success");
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setStep("form");
    setFormData({ name: "", email: "", phone: "", notes: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: primaryColor }}>
            {step === "success" ? "You're on the Waitlist!" : "Join Waitlist"}
          </DialogTitle>
          {step !== "success" && (
            <DialogDescription>
              This time slot is currently booked. We'll notify you if it becomes available.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "form" && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {format(selectedDate, "EEEE, MMMM d")} at {selectedTime} • {service.name}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-name">Your Name *</Label>
              <Input
                id="waitlist-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-email">Email</Label>
              <Input
                id="waitlist-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
              <p className="text-xs text-muted-foreground">
                We'll email you if this slot becomes available
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-phone">Phone</Label>
              <Input
                id="waitlist-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waitlist-notes">Notes (optional)</Label>
              <Textarea
                id="waitlist-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requests..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.name}
                className="flex-1"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? "Joining..." : "Join Waitlist"}
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
              <p className="font-medium text-foreground">You're on the waitlist!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
              </p>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              If this slot becomes available, we'll automatically book it for you and send you a confirmation.
            </p>
            <Button onClick={handleClose} style={{ backgroundColor: primaryColor }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
