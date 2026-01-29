import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Clock, Copy, ExternalLink, Eye, Mail, Send } from "lucide-react";
import { ThemeCustomization } from "@/components/settings/ThemeCustomization";
import { GalleryManagement } from "@/components/settings/GalleryManagement";
import { EmbedWidget } from "@/components/settings/EmbedWidget";
import { PaymentSettings } from "@/components/settings/PaymentSettings";
import { SocialLinksSettings } from "@/components/settings/SocialLinksSettings";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Paris", label: "Paris (Europe)" },
  { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
  { value: "Australia/Sydney", label: "Sydney (Australia)" },
  { value: "UTC", label: "UTC" },
];

// Time options for daily digest (every 30 minutes from 5am to 10am)
const DIGEST_TIMES = [
  { value: "05:00", label: "5:00 AM" },
  { value: "05:30", label: "5:30 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "06:30", label: "6:30 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "07:30", label: "7:30 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
];

// Reminder time options (hours before appointment)
const REMINDER_TIMES = [
  { value: "1", label: "1 hour before" },
  { value: "2", label: "2 hours before" },
  { value: "4", label: "4 hours before" },
  { value: "24", label: "1 day before" },
  { value: "48", label: "2 days before" },
];

export default function SettingsPage() {
  const { currentBusiness, refreshBusinesses } = useBusiness();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    timezone: "UTC",
  });
  
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const [dailyDigestTime, setDailyDigestTime] = useState("07:00");
  const [bookingConfirmationEnabled, setBookingConfirmationEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("24");

  useEffect(() => {
    if (currentBusiness) {
      setFormData({
        name: currentBusiness.name,
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
        address: currentBusiness.address || "",
        timezone: currentBusiness.timezone,
      });
      // Load email notification settings from business settings
      const settings = currentBusiness.settings as Record<string, unknown> | null;
      setDailyDigestEnabled(settings?.dailyDigestEnabled === true);
      setDailyDigestTime((settings?.dailyDigestTime as string) || "07:00");
      setBookingConfirmationEnabled(settings?.bookingConfirmationEnabled !== false); // Default true
      setReminderEnabled(settings?.reminderEnabled === true);
      setReminderTime((settings?.reminderTime as string) || "24");
    }
  }, [currentBusiness]);

  const handleSave = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        timezone: formData.timezone,
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success("Settings saved!");
      refreshBusinesses();
    }
    setLoading(false);
  };

  const bookingUrl = currentBusiness
    ? `${window.location.origin}/book/${currentBusiness.slug}`
    : "";

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Booking link copied!");
  };

  const updateEmailSettings = async (updates: Record<string, unknown>) => {
    if (!currentBusiness) return false;
    
    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, ...updates } as Record<string, unknown>;
    
    const { error } = await supabase
      .from("businesses")
      .update({ settings: newSettings as unknown as import("@/integrations/supabase/types").Json })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update notification settings");
      return false;
    }
    
    refreshBusinesses();
    return true;
  };

  const handleDailyDigestToggle = async (enabled: boolean) => {
    const previous = dailyDigestEnabled;
    setDailyDigestEnabled(enabled);
    
    const success = await updateEmailSettings({ dailyDigestEnabled: enabled });
    if (!success) {
      setDailyDigestEnabled(previous);
    } else {
      toast.success(enabled ? "Daily digest enabled" : "Daily digest disabled");
    }
  };

  const handleDigestTimeChange = async (time: string) => {
    const previous = dailyDigestTime;
    setDailyDigestTime(time);
    
    const success = await updateEmailSettings({ dailyDigestTime: time });
    if (!success) {
      setDailyDigestTime(previous);
    } else {
      toast.success(`Digest time updated to ${DIGEST_TIMES.find(t => t.value === time)?.label}`);
    }
  };

  const handleBookingConfirmationToggle = async (enabled: boolean) => {
    const previous = bookingConfirmationEnabled;
    setBookingConfirmationEnabled(enabled);
    
    const success = await updateEmailSettings({ bookingConfirmationEnabled: enabled });
    if (!success) {
      setBookingConfirmationEnabled(previous);
    } else {
      toast.success(enabled ? "Booking confirmations enabled" : "Booking confirmations disabled");
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    const previous = reminderEnabled;
    setReminderEnabled(enabled);
    
    const success = await updateEmailSettings({ reminderEnabled: enabled });
    if (!success) {
      setReminderEnabled(previous);
    } else {
      toast.success(enabled ? "Appointment reminders enabled" : "Appointment reminders disabled");
    }
  };

  const handleReminderTimeChange = async (time: string) => {
    const previous = reminderTime;
    setReminderTime(time);
    
    const success = await updateEmailSettings({ reminderTime: time });
    if (!success) {
      setReminderTime(previous);
    } else {
      toast.success(`Reminder time updated to ${REMINDER_TIMES.find(t => t.value === time)?.label}`);
    }
  };


  return (
    <DashboardLayout
      title="Settings"
      description="Manage your business settings"
    >
      <div className="max-w-2xl space-y-6">
        {/* Business Info */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Update your business details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@business.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(v) => setFormData({ ...formData, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={loading} className="gradient-primary">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <PaymentSettings />

        {/* Theme Customization */}
        <ThemeCustomization />

        {/* Gallery Management */}
        <GalleryManagement />

        {/* Social Media Links */}
        <SocialLinksSettings />

        {/* Email Notifications */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure automated email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booking Confirmations */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="booking-confirmation" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Booking Confirmations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send customers an email when they book an appointment
                </p>
              </div>
              <Switch
                id="booking-confirmation"
                checked={bookingConfirmationEnabled}
                onCheckedChange={handleBookingConfirmationToggle}
              />
            </div>

            {/* Appointment Reminders */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Appointment Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send customers a reminder before their appointment
                  </p>
                </div>
                <Switch
                  id="reminder"
                  checked={reminderEnabled}
                  onCheckedChange={handleReminderToggle}
                />
              </div>
              {reminderEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="reminder-time" className="text-sm font-normal">
                    Send reminder
                  </Label>
                  <Select value={reminderTime} onValueChange={handleReminderTimeChange}>
                    <SelectTrigger id="reminder-time" className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_TIMES.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Daily Digest */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-digest" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Daily Digest
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a morning email with your day's scheduled bookings
                  </p>
                </div>
                <Switch
                  id="daily-digest"
                  checked={dailyDigestEnabled}
                  onCheckedChange={handleDailyDigestToggle}
                />
              </div>
              {dailyDigestEnabled && (
                <div className="space-y-3 mt-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="digest-time" className="text-sm font-normal">
                      Delivery time
                    </Label>
                    <Select value={dailyDigestTime} onValueChange={handleDigestTimeChange}>
                      <SelectTrigger id="digest-time" className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIGEST_TIMES.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    You'll receive your daily summary at {DIGEST_TIMES.find(t => t.value === dailyDigestTime)?.label} in your timezone ({formData.timezone})
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Booking Link */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Online Booking</CardTitle>
            <CardDescription>
              Share this link with your customers to let them book online
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={bookingUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyBookingUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4 mr-2" />
                Preview Booking Page
                <ExternalLink className="w-4 h-4 ml-auto" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              Share this link with customers so they can view your services and gallery.
            </p>
          </CardContent>
        </Card>

        {/* Website Embed Widget */}
        <EmbedWidget />

        {/* PWA Install */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Mobile App</CardTitle>
            <CardDescription>
              Install LEK on your phone for quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              On your phone, tap the share button in your browser and select "Add to Home Screen" 
              to install LEK as an app.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="/install" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Install Instructions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
