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
import { Copy, ExternalLink, Eye, Mail } from "lucide-react";
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

  useEffect(() => {
    if (currentBusiness) {
      setFormData({
        name: currentBusiness.name,
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
        address: currentBusiness.address || "",
        timezone: currentBusiness.timezone,
      });
      // Load daily digest setting from business settings
      const settings = currentBusiness.settings as Record<string, unknown> | null;
      setDailyDigestEnabled(settings?.dailyDigestEnabled === true);
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

  const handleDailyDigestToggle = async (enabled: boolean) => {
    if (!currentBusiness) return;
    
    setDailyDigestEnabled(enabled);
    
    const currentSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, dailyDigestEnabled: enabled };
    
    const { error } = await supabase
      .from("businesses")
      .update({ settings: newSettings })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to update notification settings");
      setDailyDigestEnabled(!enabled); // Revert on error
    } else {
      toast.success(enabled ? "Daily digest enabled" : "Daily digest disabled");
      refreshBusinesses();
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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-digest">Daily Digest</Label>
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
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                You'll receive a daily summary at 7:00 AM in your timezone ({formData.timezone})
              </p>
            )}
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
