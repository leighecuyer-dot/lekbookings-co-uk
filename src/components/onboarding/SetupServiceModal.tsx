import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Plus, Loader2 } from "lucide-react";

interface SetupServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onComplete: () => void;
}

const DEMO_SERVICES = [
  { name: "Haircut", description: "Classic haircut and styling", duration_minutes: 30, price: 25 },
  { name: "Colour", description: "Full head colour treatment", duration_minutes: 90, price: 85 },
  { name: "Blowdry", description: "Wash and blowdry styling", duration_minutes: 45, price: 35 },
  { name: "Highlights", description: "Partial or full highlights", duration_minutes: 120, price: 110 },
  { name: "Cut & Colour", description: "Haircut with colour service", duration_minutes: 120, price: 100 },
];

export function SetupServiceModal({ open, onOpenChange, businessId, onComplete }: SetupServiceModalProps) {
  const [view, setView] = useState<"choice" | "manual" | "loading">("choice");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: 0,
  });

  const handleAddDemoData = async () => {
    setView("loading");
    setLoading(true);

    try {
      const { error } = await supabase
        .from("services")
        .insert(
          DEMO_SERVICES.map((service) => ({
            ...service,
            business_id: businessId,
            is_active: true,
          }))
        );

      if (error) throw error;

      toast.success(`Added ${DEMO_SERVICES.length} sample services!`);
      onComplete();
      onOpenChange(false);
      setView("choice");
    } catch (error) {
      console.error("Error adding demo services:", error);
      toast.error("Failed to add services");
      setView("choice");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a service name");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("services").insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration_minutes: formData.duration_minutes,
        price: formData.price || null,
        business_id: businessId,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Service added!");
      onComplete();
      onOpenChange(false);
      setView("choice");
      setFormData({ name: "", description: "", duration_minutes: 30, price: 0 });
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error("Failed to add service");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setView("choice");
      setFormData({ name: "", description: "", duration_minutes: 30, price: 0 });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Your Services</DialogTitle>
          <DialogDescription>
            {view === "choice" && "Would you like to start with sample salon services or add your own?"}
            {view === "manual" && "Enter the details for your first service"}
            {view === "loading" && "Setting up your services..."}
          </DialogDescription>
        </DialogHeader>

        {view === "choice" && (
          <div className="space-y-4 pt-4">
            <Button
              onClick={handleAddDemoData}
              className="w-full h-auto py-4 flex flex-col items-start gap-2"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-semibold">Use sample services</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Add Haircut, Colour, Blowdry, Highlights - you can edit these later
              </span>
            </Button>

            <Button
              onClick={() => setView("manual")}
              className="w-full h-auto py-4 flex flex-col items-start gap-2"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <span className="font-semibold">Add my own</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Create a custom service from scratch
              </span>
            </Button>
          </div>
        )}

        {view === "manual" && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                placeholder="e.g. Haircut"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">Description</Label>
              <Textarea
                id="service-description"
                placeholder="Describe the service..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (mins)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-price">Price (£)</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setView("choice")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleAddManual} disabled={loading} className="flex-1 gradient-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Service"}
              </Button>
            </div>
          </div>
        )}

        {view === "loading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-4">Adding your services...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
