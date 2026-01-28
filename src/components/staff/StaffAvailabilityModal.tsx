import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkingDay {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  monday: WorkingDay;
  tuesday: WorkingDay;
  wednesday: WorkingDay;
  thursday: WorkingDay;
  friday: WorkingDay;
  saturday: WorkingDay;
  sunday: WorkingDay;
}

const DEFAULT_HOURS: WorkingHours = {
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "10:00", end: "16:00" },
  sunday: { enabled: false, start: "10:00", end: "16:00" },
};

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

interface StaffAvailabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  currentHours: WorkingHours | null;
  onSave: () => void;
}

export function StaffAvailabilityModal({
  open,
  onOpenChange,
  staffId,
  staffName,
  currentHours,
  onSave,
}: StaffAvailabilityModalProps) {
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentHours) {
      setHours(currentHours);
    } else {
      setHours(DEFAULT_HOURS);
    }
  }, [currentHours, open]);

  const updateDay = (day: keyof WorkingHours, field: keyof WorkingDay, value: boolean | string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("staff")
      .update({ working_hours: JSON.parse(JSON.stringify(hours)) })
      .eq("id", staffId);

    if (error) {
      toast.error("Failed to save working hours");
      console.error(error);
    } else {
      toast.success("Working hours saved!");
      onSave();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Working Hours - {staffName}</DialogTitle>
          <DialogDescription>
            Set the availability for this team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4 max-h-[400px] overflow-y-auto pr-2">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              <div className="w-28 flex items-center gap-2">
                <Switch
                  checked={hours[key].enabled}
                  onCheckedChange={(checked) => updateDay(key, "enabled", checked)}
                />
                <Label className="text-sm font-medium">{label}</Label>
              </div>
              
              {hours[key].enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={hours[key].start}
                    onChange={(e) => updateDay(key, "start", e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={hours[key].end}
                    onChange={(e) => updateDay(key, "end", e.target.value)}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? "Saving..." : "Save Hours"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
