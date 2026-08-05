import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell } from "lucide-react";

interface Settings {
  owner_email: string | null;
  owner_phone: string | null;
  notify_new_booking: boolean;
  notify_cancellation: boolean;
  notify_reschedule: boolean;
  owner_channel_email: boolean;
  owner_channel_sms: boolean;
  staff_alerts_enabled: boolean;
  staff_alert_channel_email: boolean;
  staff_alert_channel_sms: boolean;
}

const DEFAULTS: Settings = {
  owner_email: "",
  owner_phone: "",
  notify_new_booking: true,
  notify_cancellation: true,
  notify_reschedule: false,
  owner_channel_email: true,
  owner_channel_sms: false,
  staff_alerts_enabled: true,
  staff_alert_channel_email: true,
  staff_alert_channel_sms: false,
};

export function NotificationSettingsSection() {
  const { currentBusiness } = useBusiness();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_notification_settings")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .maybeSingle();
      if (data) {
        setSettings({
          owner_email: data.owner_email ?? "",
          owner_phone: data.owner_phone ?? "",
          notify_new_booking: data.notify_new_booking,
          notify_cancellation: data.notify_cancellation,
          notify_reschedule: data.notify_reschedule,
          owner_channel_email: data.owner_channel_email,
          owner_channel_sms: data.owner_channel_sms,
          staff_alerts_enabled: data.staff_alerts_enabled,
          staff_alert_channel_email: data.staff_alert_channel_email,
          staff_alert_channel_sms: data.staff_alert_channel_sms,
        });
      } else {
        setSettings({ ...DEFAULTS, owner_email: currentBusiness.email ?? "" });
      }
      setLoading(false);
    })();
  }, [currentBusiness]);

  const save = async () => {
    if (!currentBusiness) return;
    setSaving(true);
    const { error } = await supabase
      .from("business_notification_settings")
      .upsert(
        {
          business_id: currentBusiness.id,
          ...settings,
          owner_email: settings.owner_email?.trim() || null,
          owner_phone: settings.owner_phone?.trim() || null,
        },
        { onConflict: "business_id" },
      );
    setSaving(false);
    if (error) toast.error("Could not save notification settings");
    else toast.success("Notification settings saved");
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  if (loading) return null;

  const toggle = (label: string, hint: string, key: keyof Settings) => (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="pr-3">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch
        checked={settings[key] as boolean}
        onCheckedChange={(v) => set(key, v as Settings[keyof Settings])}
      />
    </div>
  );

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Booking Alerts
        </CardTitle>
        <CardDescription>
          Choose what you and your team get told about. Customer confirmations are sent separately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Your alert email</Label>
            <Input
              type="email"
              value={settings.owner_email ?? ""}
              onChange={(e) => set("owner_email", e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Your alert mobile</Label>
            <Input
              type="tel"
              value={settings.owner_phone ?? ""}
              onChange={(e) => set("owner_phone", e.target.value)}
              placeholder="07…"
            />
          </div>
        </div>

        {toggle("New bookings", "Tell me when a booking comes in", "notify_new_booking")}
        {toggle("Cancellations", "Tell me when a booking is cancelled", "notify_cancellation")}
        {toggle("Reschedules", "Tell me when a booking is moved", "notify_reschedule")}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {toggle("Send my alerts by email", "Uses the email above", "owner_channel_email")}
          {toggle("Send my alerts by SMS", "Uses your SMS allowance", "owner_channel_sms")}
        </div>

        <Separator />

        {toggle(
          "Alert staff about their own bookings",
          "Each team member is told when someone books with them",
          "staff_alerts_enabled",
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {toggle("Staff alerts by email", "Uses the email on their staff profile", "staff_alert_channel_email")}
          {toggle("Staff alerts by SMS", "Uses the mobile on their staff profile", "staff_alert_channel_sms")}
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save alert settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
