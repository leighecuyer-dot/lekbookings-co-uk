import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export function PrivacySettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [shareRevenueWithReseller, setShareRevenueWithReseller] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      const settings = currentBusiness.settings as Record<string, unknown> | null;
      setShareRevenueWithReseller(settings?.share_revenue_with_reseller === true);
    }
  }, [currentBusiness]);

  const updatePrivacySetting = async (key: string, value: boolean) => {
    if (!currentBusiness) return false;

    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, [key]: value };

    const { error } = await supabase
      .from("businesses")
      .update({ settings: newSettings as unknown as Json })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update privacy settings");
      return false;
    }

    refreshBusinesses();
    return true;
  };

  const handleShareRevenueToggle = async (enabled: boolean) => {
    const previous = shareRevenueWithReseller;
    setShareRevenueWithReseller(enabled);

    const success = await updatePrivacySetting("share_revenue_with_reseller", enabled);
    if (!success) {
      setShareRevenueWithReseller(previous);
    } else {
      toast.success(
        enabled
          ? "Revenue data is now visible to your admin"
          : "Revenue data is now private"
      );
    }
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control what data is visible to your account administrator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="share-revenue"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Share Revenue Data
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow your administrator to view your revenue figures and performance metrics
            </p>
          </div>
          <Switch
            id="share-revenue"
            checked={shareRevenueWithReseller}
            onCheckedChange={handleShareRevenueToggle}
          />
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {shareRevenueWithReseller ? (
              <>
                <span className="font-medium text-foreground">Sharing enabled:</span> Your
                administrator can see your revenue growth, weekly performance, and trends data.
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">Sharing disabled:</span> Your
                revenue data is private. Your administrator can only see booking counts
                and operational data, not financial figures.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
