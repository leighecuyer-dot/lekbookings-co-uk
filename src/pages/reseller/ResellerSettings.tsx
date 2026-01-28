import { useState, useEffect } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Palette, Upload, Building2 } from "lucide-react";

export default function ResellerSettings() {
  const { reseller, refreshReseller } = useReseller();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
    primary_color: "#4F46E5",
    secondary_color: "#06B6D4",
    markup_percentage: 0,
    support_email: "",
    website_url: "",
  });

  useEffect(() => {
    if (reseller) {
      const settings = reseller.settings as Record<string, string> || {};
      setFormData({
        company_name: reseller.company_name,
        contact_email: reseller.contact_email || "",
        contact_phone: reseller.contact_phone || "",
        logo_url: reseller.logo_url || "",
        primary_color: reseller.primary_color,
        secondary_color: reseller.secondary_color,
        markup_percentage: reseller.markup_percentage,
        support_email: settings.support_email || "",
        website_url: settings.website_url || "",
      });
    }
  }, [reseller]);

  const handleSave = async () => {
    if (!reseller) return;

    setLoading(true);
    const { error } = await supabase
      .from("resellers")
      .update({
        company_name: formData.company_name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        markup_percentage: formData.markup_percentage,
        settings: {
          ...((reseller.settings as Record<string, unknown>) || {}),
          support_email: formData.support_email || null,
          website_url: formData.website_url || null,
        },
      })
      .eq("id", reseller.id);

    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success("Settings saved!");
      refreshReseller();
    }
    setLoading(false);
  };

  const resellerUrl = reseller
    ? `${window.location.origin}/partner/${reseller.slug}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(resellerUrl);
    toast.success("URL copied!");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `reseller-logos/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("business-assets")
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <ResellerLayout title="Settings" description="Configure your reseller account and white-label branding">
      <div className="max-w-2xl space-y-6">
        {/* Company Info */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={formData.support_email}
                  onChange={(e) =>
                    setFormData({ ...formData, support_email: e.target.value })
                  }
                  placeholder="support@yourcompany.com"
                />
                <p className="text-xs text-muted-foreground">
                  Shown in customer-facing emails
                </p>
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) =>
                    setFormData({ ...formData, website_url: e.target.value })
                  }
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* White-Label Branding */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>White-Label Branding</CardTitle>
            </div>
            <CardDescription>
              These settings are applied to your clients' booking pages and email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-lg object-cover border-2 border-primary"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <Label
                    htmlFor="logo-upload-settings"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? "Uploading..." : formData.logo_url ? "Change Logo" : "Upload Logo"}
                  </Label>
                  <input
                    id="logo-upload-settings"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Brand Preview */}
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-3">Brand Preview:</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Primary
                </div>
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: formData.secondary_color }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Set your markup on base prices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Markup Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.markup_percentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    markup_percentage: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Your clients will be charged base price + {formData.markup_percentage}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Partner URL */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Partner URL</CardTitle>
            <CardDescription>
              Share this link with potential clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={resellerUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={loading} className="gradient-primary">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </ResellerLayout>
  );
}
