import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Sparkles, Building2, Rocket } from "lucide-react";

export const SUBSCRIPTION_TIERS = [
  { 
    value: "free", 
    label: "Free", 
    price: 0, 
    description: "Beta testers - unlimited access",
    icon: Sparkles,
    color: "bg-purple-500"
  },
  { 
    value: "essential", 
    label: "Essential", 
    price: 2000,
    description: "50 SMS, 2 staff members",
    icon: Building2,
    color: "bg-blue-500"
  },
  { 
    value: "professional", 
    label: "Professional", 
    price: 5900,
    description: "200 SMS, 5 staff, Reports",
    icon: Rocket,
    color: "bg-primary"
  },
  { 
    value: "enterprise", 
    label: "Enterprise", 
    price: 14900,
    description: "Unlimited SMS & staff",
    icon: Crown,
    color: "bg-amber-500"
  },
];

interface ChangeTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  businessName: string;
  currentTier: string | null;
  onSuccess: () => void;
}

export function ChangeTierDialog({
  open,
  onOpenChange,
  clientId,
  businessName,
  currentTier,
  onSuccess,
}: ChangeTierDialogProps) {
  const [selectedTier, setSelectedTier] = useState(currentTier || "essential");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    try {
      const tierConfig = SUBSCRIPTION_TIERS.find(t => t.value === selectedTier);
      
      const { error } = await supabase
        .from("reseller_clients")
        .update({ 
          subscription_tier: selectedTier,
          monthly_price: tierConfig?.price || 0,
        })
        .eq("id", clientId);

      if (error) {
        console.error("Error updating tier:", error);
        toast.error("Failed to update subscription tier");
        return;
      }

      toast.success(`${businessName} updated to ${tierConfig?.label} tier`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currentTierConfig = SUBSCRIPTION_TIERS.find(t => t.value === currentTier);
  const selectedTierConfig = SUBSCRIPTION_TIERS.find(t => t.value === selectedTier);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscription Tier</DialogTitle>
          <DialogDescription>
            Update the subscription tier for <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Tier */}
          {currentTierConfig && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Current tier:</span>
              <Badge variant="secondary" className="capitalize">
                {currentTierConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground ml-auto">
                £{(currentTierConfig.price / 100).toFixed(2)}/mo
              </span>
            </div>
          )}

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label>New Subscription Tier</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <SelectItem key={tier.value} value={tier.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{tier.label}</span>
                        <span className="text-muted-foreground ml-2">
                          {tier.price === 0 ? "Free" : `£${(tier.price / 100).toFixed(2)}/mo`}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Tier Details */}
          {selectedTierConfig && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <selectedTierConfig.icon className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedTierConfig.label}</span>
                {selectedTierConfig.value === "free" && (
                  <Badge className="bg-purple-500">Beta</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedTierConfig.description}
              </p>
              <p className="text-lg font-semibold mt-2">
                {selectedTierConfig.price === 0 
                  ? "Free" 
                  : `£${(selectedTierConfig.price / 100).toFixed(2)}/month`}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gradient-primary"
              onClick={handleSave}
              disabled={loading || selectedTier === currentTier}
            >
              {loading ? "Saving..." : "Update Tier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
