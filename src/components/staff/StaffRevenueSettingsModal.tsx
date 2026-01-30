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
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Percent, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StaffRevenueSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  currentRevenueTrackingEnabled: boolean;
  currentCommissionPercentage: number;
  onSave: () => void;
}

export function StaffRevenueSettingsModal({
  open,
  onOpenChange,
  staffId,
  staffName,
  currentRevenueTrackingEnabled,
  currentCommissionPercentage,
  onSave,
}: StaffRevenueSettingsModalProps) {
  const [revenueTrackingEnabled, setRevenueTrackingEnabled] = useState(currentRevenueTrackingEnabled);
  const [commissionPercentage, setCommissionPercentage] = useState(currentCommissionPercentage);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRevenueTrackingEnabled(currentRevenueTrackingEnabled);
    setCommissionPercentage(currentCommissionPercentage);
  }, [currentRevenueTrackingEnabled, currentCommissionPercentage, open]);

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("staff")
      .update({
        revenue_tracking_enabled: revenueTrackingEnabled,
        commission_percentage: commissionPercentage,
      })
      .eq("id", staffId);

    if (error) {
      toast.error("Failed to update revenue settings");
      console.error(error);
    } else {
      toast.success("Revenue settings updated");
      onSave();
      onOpenChange(false);
    }
    
    setSaving(false);
  };

  const handlePercentageInputChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setCommissionPercentage(num);
    } else if (value === "") {
      setCommissionPercentage(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Settings
          </DialogTitle>
          <DialogDescription>
            Configure revenue tracking for {staffName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Revenue Tracking Toggle */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="revenue-tracking" className="font-medium">
                  Track Revenue
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>
                        Turn this off if this staff member is paid directly by customers 
                        (e.g., chair rental) and their bookings shouldn't count towards your business revenue.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Include bookings in revenue reports
              </p>
            </div>
            <Switch
              id="revenue-tracking"
              checked={revenueTrackingEnabled}
              onCheckedChange={setRevenueTrackingEnabled}
            />
          </div>

          {/* Commission Percentage */}
          <div className={`space-y-4 ${!revenueTrackingEnabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Commission Rate</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>
                          The percentage of booking revenue attributed to this staff member.
                          Use 100% for employees, or a lower percentage for commission-based arrangements.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                  Percentage of booking value
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={commissionPercentage}
                  onChange={(e) => handlePercentageInputChange(e.target.value)}
                  className="w-20 text-right"
                  disabled={!revenueTrackingEnabled}
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <Slider
              value={[commissionPercentage]}
              onValueChange={(value) => setCommissionPercentage(value[0])}
              min={0}
              max={100}
              step={5}
              disabled={!revenueTrackingEnabled}
              className="py-2"
            />

            {/* Visual breakdown */}
            {revenueTrackingEnabled && (
              <div className="flex gap-2 text-sm">
                <div 
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${commissionPercentage}%` }}
                />
                <div 
                  className="h-2 rounded-full bg-muted transition-all"
                  style={{ width: `${100 - commissionPercentage}%` }}
                />
              </div>
            )}

            {revenueTrackingEnabled && (
              <p className="text-sm text-muted-foreground text-center">
                {commissionPercentage === 100 
                  ? "Full revenue attributed to this staff member"
                  : commissionPercentage === 0
                  ? "No revenue attributed to this staff member"
                  : `${commissionPercentage}% to staff, ${100 - commissionPercentage}% retained by business`
                }
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
