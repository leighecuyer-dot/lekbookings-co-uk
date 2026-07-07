import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/subscription/useSubscriptionTier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

const TIER_CAPS: Record<string, number> = {
  free: 0, essential: 50, professional: 200, enterprise: 1000, unknown: 0,
};

const TOKEN_HELP = "{{customer_name}}  {{service_name}}  {{business_name}}  {{staff_name}}  {{start_time}}";

interface Settings {
  sms_enabled: boolean;
  confirmation_enabled: boolean;
  reminder_enabled: boolean;
  status_change_enabled: boolean;
  confirmation_template: string;
  reminder_template: string;
  cancellation_template: string;
  reschedule_template: string;
}

const DEFAULTS: Settings = {
  sms_enabled: false,
  confirmation_enabled: true,
  reminder_enabled: true,
  status_change_enabled: true,
  confirmation_template: "Hi {{customer_name}}, your {{service_name}} at {{business_name}} is booked for {{start_time}}. Reply STOP to opt out.",
  reminder_template: "Reminder: {{service_name}} at {{business_name}} tomorrow at {{start_time}}. See you then!",
  cancellation_template: "Your {{service_name}} on {{start_time}} at {{business_name}} has been cancelled.",
  reschedule_template: "Your {{service_name}} at {{business_name}} has been rescheduled to {{start_time}}.",
};

export function SMSNotificationsSection() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { tier } = useSubscriptionTier(currentBusiness?.id ?? null);
  const cap = TIER_CAPS[tier] ?? 0;

  const [isOwner, setIsOwner] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [usage, setUsage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!currentBusiness || !user) return;
    (async () => {
      const { data: myRole } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("business_id", currentBusiness.id).maybeSingle();
      setIsOwner(myRole?.role === "owner" || myRole?.role === "admin");

      const { data: row } = await supabase
        .from("business_sms_settings").select("*")
        .eq("business_id", currentBusiness.id).maybeSingle();
      if (row) {
        setSettings({
          sms_enabled: row.sms_enabled,
          confirmation_enabled: row.confirmation_enabled,
          reminder_enabled: row.reminder_enabled,
          status_change_enabled: row.status_change_enabled,
          confirmation_template: row.confirmation_template,
          reminder_template: row.reminder_template,
          cancellation_template: row.cancellation_template,
          reschedule_template: row.reschedule_template,
        });
      }

      const month = new Date().toISOString().slice(0, 7);
      const { data: u } = await supabase
        .from("sms_usage").select("sent_count")
        .eq("business_id", currentBusiness.id).eq("month", month).maybeSingle();
      setUsage(u?.sent_count ?? 0);
    })();
  }, [currentBusiness, user]);

  if (!isOwner || !currentBusiness) return null;

  const canUseSms = cap > 0;
  const usagePct = cap > 0 ? Math.min(100, (usage / cap) * 100) : 0;

  const save = async () => {
    if (!currentBusiness) return;
    setSaving(true);
    const { error } = await supabase
      .from("business_sms_settings")
      .upsert({ business_id: currentBusiness.id, ...settings }, { onConflict: "business_id" });
    setSaving(false);
    if (error) { toast.error("Failed to save SMS settings"); return; }
    toast.success("SMS settings saved");
  };

  const sendTest = async () => {
    if (!testPhone.trim()) { toast.error("Enter a phone number"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        businessId: currentBusiness.id,
        eventType: "test",
        to: testPhone.trim(),
        bodyOverride: `Test SMS from ${currentBusiness.name}. If you received this, SMS is working.`,
      },
    });
    setTesting(false);
    if (error) { toast.error("Test send failed"); return; }
    const status = (data as { status?: string })?.status;
    if (status === "sent") toast.success("Test SMS sent");
    else if (status === "not_configured") toast.error("Twilio credentials missing — contact support");
    else if (status === "disabled") toast.error("Enable SMS first, then save, then try again");
    else if (status === "over_cap") toast.error("Monthly SMS cap reached for this tier");
    else if (status === "invalid_number") toast.error("Invalid phone number format");
    else if (status === "opted_out") toast.error("This number has opted out");
    else toast.warning(`Result: ${status ?? "unknown"}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>SMS Notifications</CardTitle>
        </div>
        <CardDescription>
          Text your customers when bookings are confirmed, reminded, cancelled or rescheduled.
          Customers can always reply STOP to opt out.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canUseSms && (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            SMS is not included in your current tier ({tier}). Upgrade to Essential or higher to send SMS.
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Enable SMS</Label>
            <p className="text-xs text-muted-foreground">Master switch for all SMS sends.</p>
          </div>
          <Switch
            checked={settings.sms_enabled}
            disabled={!canUseSms}
            onCheckedChange={(v) => setSettings({ ...settings, sms_enabled: v })}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Booking confirmation</Label>
            <Switch
              checked={settings.confirmation_enabled}
              disabled={!canUseSms || !settings.sms_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, confirmation_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>24-hour reminder</Label>
            <Switch
              checked={settings.reminder_enabled}
              disabled={!canUseSms || !settings.sms_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Status changes (cancel/reschedule)</Label>
            <Switch
              checked={settings.status_change_enabled}
              disabled={!canUseSms || !settings.sms_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, status_change_enabled: v })}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Available tokens: <code className="font-mono">{TOKEN_HELP}</code>
          </p>
          {([
            ["confirmation_template", "Confirmation template"],
            ["reminder_template", "Reminder template"],
            ["cancellation_template", "Cancellation template"],
            ["reschedule_template", "Reschedule template"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <Badge variant={settings[key].length > 160 ? "destructive" : "secondary"}>
                  {settings[key].length} chars
                </Badge>
              </div>
              <Textarea
                value={settings[key]}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                rows={3}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Monthly usage</span>
            <span className={usage >= cap && cap > 0 ? "text-destructive font-medium" : ""}>
              {usage} / {cap === 0 ? "—" : cap} SMS
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={usagePct >= 100 ? "h-full bg-destructive" : "h-full bg-primary"}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Send test SMS</Label>
          <div className="flex gap-2">
            <Input
              placeholder="+447700900000"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Button onClick={sendTest} disabled={testing || !canUseSms} variant="outline">
              <Send className="h-4 w-4 mr-2" />
              {testing ? "Sending..." : "Test"}
            </Button>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="gradient-primary">
          {saving ? "Saving..." : "Save SMS settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
