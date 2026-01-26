import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (currentBusiness) {
      setFormData({
        name: currentBusiness.name,
        phone: currentBusiness.phone || "",
        email: currentBusiness.email || "",
        address: currentBusiness.address || "",
        timezone: currentBusiness.timezone,
      });
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

        {/* Booking Link */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Online Booking</CardTitle>
            <CardDescription>
              Share this link with your customers to let them book online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={bookingUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyBookingUrl}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Public booking page coming soon! For now, create bookings from the Calendar.
            </p>
          </CardContent>
        </Card>

        {/* PWA Install */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Mobile App</CardTitle>
            <CardDescription>
              Install BookFlow on your phone for quick access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              On your phone, tap the share button in your browser and select "Add to Home Screen" 
              to install BookFlow as an app.
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
