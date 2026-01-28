import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Percent, DollarSign } from "lucide-react";

interface PaymentConfig {
  requireDeposit: boolean;
  depositType: "percentage" | "fixed";
  depositAmount: number;
  autoConfirmOnDeposit: boolean;
  autoConfirmOnFullPayment: boolean;
  requireConfirmation: boolean; // If no payment needed, customer must confirm
}

const DEFAULT_CONFIG: PaymentConfig = {
  requireDeposit: false,
  depositType: "percentage",
  depositAmount: 20,
  autoConfirmOnDeposit: true,
  autoConfirmOnFullPayment: true,
  requireConfirmation: true,
};

export function PaymentSettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (currentBusiness?.settings) {
      const settings = currentBusiness.settings as Record<string, unknown>;
      const paymentConfig = settings.paymentConfig as PaymentConfig | undefined;
      if (paymentConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...paymentConfig });
      }
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const existingSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    
    const newSettings = {
      ...existingSettings,
      paymentConfig: config,
    };
    
    const { error } = await supabase
      .from("businesses")
      .update({
        settings: newSettings as unknown as null, // Cast to satisfy Json type
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to save payment settings");
    } else {
      toast.success("Payment settings saved!");
      refreshBusinesses();
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment & Deposits
        </CardTitle>
        <CardDescription>
          Configure how customers pay for bookings and when their status updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deposit Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label className="font-medium">Require Deposit</Label>
            <p className="text-sm text-muted-foreground">
              Customers must pay a deposit to confirm their booking
            </p>
          </div>
          <Switch
            checked={config.requireDeposit}
            onCheckedChange={(checked) => setConfig({ ...config, requireDeposit: checked })}
          />
        </div>

        {/* Deposit Configuration */}
        {config.requireDeposit && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Type</Label>
                <Select
                  value={config.depositType}
                  onValueChange={(v: "percentage" | "fixed") => setConfig({ ...config, depositType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <span className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Percentage of total
                      </span>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Fixed amount
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {config.depositType === "percentage" ? "Deposit %" : "Deposit Amount"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={config.depositType === "percentage" ? 100 : undefined}
                    value={config.depositAmount}
                    onChange={(e) => setConfig({ ...config, depositAmount: parseFloat(e.target.value) || 0 })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {config.depositType === "percentage" ? "%" : "$"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="font-medium">Auto-confirm on deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically confirm booking when deposit is paid
                </p>
              </div>
              <Switch
                checked={config.autoConfirmOnDeposit}
                onCheckedChange={(checked) => setConfig({ ...config, autoConfirmOnDeposit: checked })}
              />
            </div>
          </div>
        )}

        {/* Full Payment Option */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label className="font-medium">Auto-confirm on full payment</Label>
            <p className="text-sm text-muted-foreground">
              Automatically confirm booking when paid in full
            </p>
          </div>
          <Switch
            checked={config.autoConfirmOnFullPayment}
            onCheckedChange={(checked) => setConfig({ ...config, autoConfirmOnFullPayment: checked })}
          />
        </div>

        {/* No Payment Required Option */}
        {!config.requireDeposit && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="font-medium">Require customer confirmation</Label>
              <p className="text-sm text-muted-foreground">
                If no payment is required, customer must confirm their booking
              </p>
            </div>
            <Switch
              checked={config.requireConfirmation}
              onCheckedChange={(checked) => setConfig({ ...config, requireConfirmation: checked })}
            />
          </div>
        )}

        {/* Status Flow Explanation */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <h4 className="font-medium text-sm mb-2">Booking Status Flow</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {config.requireDeposit ? (
              <>
                <p>1. <span className="font-medium text-foreground">Pending</span> → Customer books appointment</p>
                <p>2. <span className="font-medium text-foreground">Confirmed</span> → Deposit paid ({config.depositType === "percentage" ? `${config.depositAmount}%` : `$${config.depositAmount}`})</p>
                <p>3. <span className="font-medium text-foreground">Completed</span> → Service delivered & full payment</p>
              </>
            ) : config.requireConfirmation ? (
              <>
                <p>1. <span className="font-medium text-foreground">Pending</span> → Customer books appointment</p>
                <p>2. <span className="font-medium text-foreground">Confirmed</span> → Customer or salon confirms</p>
                <p>3. <span className="font-medium text-foreground">Completed</span> → Service delivered</p>
              </>
            ) : (
              <>
                <p>1. <span className="font-medium text-foreground">Confirmed</span> → Booking auto-confirmed</p>
                <p>2. <span className="font-medium text-foreground">Completed</span> → Service delivered</p>
              </>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary">
          {loading ? "Saving..." : "Save Payment Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
