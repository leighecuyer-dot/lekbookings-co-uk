import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

interface SetupStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onComplete: () => void;
}

export function SetupStaffModal({ open, onOpenChange, businessId, onComplete }: SetupStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a staff member name");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("staff").insert({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        business_id: businessId,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Team member added!");
      onComplete();
      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "" });
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFormData({ name: "", email: "", phone: "" });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <User className="w-5 h-5" />
            Add a Team Member
          </DialogTitle>
          <DialogDescription>
            Add yourself or your first team member. You can add more later from the Staff page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name *</Label>
            <Input
              id="staff-name"
              placeholder="e.g. Sarah Johnson"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-email">Email (optional)</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="sarah@salon.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-phone">Phone (optional)</Label>
            <Input
              id="staff-phone"
              placeholder="+44 7700 900000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Skip for now
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 gradient-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Team Member"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
