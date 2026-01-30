import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Eye, Users, FileText, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface PrivacySettingsData {
  share_revenue_with_reseller: boolean;
  share_customer_contact_with_reseller: boolean;
  share_booking_notes_with_reseller: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsData = {
  share_revenue_with_reseller: false,
  share_customer_contact_with_reseller: true,
  share_booking_notes_with_reseller: true,
};

export function getPrivacySettings(businessSettings: Record<string, unknown> | null): PrivacySettingsData {
  return {
    share_revenue_with_reseller: businessSettings?.share_revenue_with_reseller === true,
    share_customer_contact_with_reseller: businessSettings?.share_customer_contact_with_reseller !== false,
    share_booking_notes_with_reseller: businessSettings?.share_booking_notes_with_reseller !== false,
  };
}

export function PrivacySettings() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [settings, setSettings] = useState<PrivacySettingsData>(DEFAULT_PRIVACY_SETTINGS);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (currentBusiness) {
      const businessSettings = currentBusiness.settings as Record<string, unknown> | null;
      setSettings(getPrivacySettings(businessSettings));
    }
  }, [currentBusiness]);

  const updatePrivacySetting = async (key: keyof PrivacySettingsData, value: boolean) => {
    if (!currentBusiness) return false;

    setUpdating(key);
    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, [key]: value };

    const { error } = await supabase
      .from("businesses")
      .update({ settings: newSettings as unknown as Json })
      .eq("id", currentBusiness.id);

    setUpdating(null);

    if (error) {
      toast.error("Failed to update privacy settings");
      return false;
    }

    refreshBusinesses();
    return true;
  };

  const handleToggle = async (key: keyof PrivacySettingsData, enabled: boolean, successMessage: string) => {
    const previous = settings[key];
    setSettings((prev) => ({ ...prev, [key]: enabled }));

    const success = await updatePrivacySetting(key, enabled);
    if (!success) {
      setSettings((prev) => ({ ...prev, [key]: previous }));
    } else {
      toast.success(successMessage);
    }
  };

  const privacyItems = [
    {
      key: "share_revenue_with_reseller" as const,
      icon: Eye,
      label: "Share Revenue Data",
      description: "Allow your administrator to view revenue figures and performance metrics",
      enabledMessage: "Revenue data is now visible to your admin",
      disabledMessage: "Revenue data is now private",
    },
    {
      key: "share_customer_contact_with_reseller" as const,
      icon: Phone,
      label: "Share Customer Contact Info",
      description: "Allow your administrator to view customer phone numbers and email addresses",
      enabledMessage: "Customer contact info is now visible to your admin",
      disabledMessage: "Customer contact info is now private",
    },
    {
      key: "share_booking_notes_with_reseller" as const,
      icon: FileText,
      label: "Share Booking Notes",
      description: "Allow your administrator to view notes attached to bookings",
      enabledMessage: "Booking notes are now visible to your admin",
      disabledMessage: "Booking notes are now private",
    },
  ];

  // Count how many items are shared
  const sharedCount = Object.values(settings).filter(Boolean).length;

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
      <CardContent className="space-y-4">
        {privacyItems.map((item, index) => (
          <div key={item.key}>
            {index > 0 && <Separator className="my-4" />}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 mr-4">
                <Label
                  htmlFor={item.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <Switch
                id={item.key}
                checked={settings[item.key]}
                disabled={updating === item.key}
                onCheckedChange={(checked) =>
                  handleToggle(
                    item.key,
                    checked,
                    checked ? item.enabledMessage : item.disabledMessage
                  )
                }
              />
            </div>
          </div>
        ))}

        <div className="bg-muted/50 p-3 rounded-lg mt-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Privacy Summary
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {sharedCount === 0 ? (
              <>All data is private. Your administrator can only see basic operational information.</>
            ) : sharedCount === privacyItems.length ? (
              <>Full access enabled. Your administrator can view all business data.</>
            ) : (
              <>
                Sharing {sharedCount} of {privacyItems.length} data categories with your administrator.
                {!settings.share_revenue_with_reseller && " Revenue data is private."}
                {!settings.share_customer_contact_with_reseller && " Customer contacts are hidden."}
                {!settings.share_booking_notes_with_reseller && " Booking notes are hidden."}
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
