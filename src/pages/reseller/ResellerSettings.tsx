import { useState, useEffect } from "react";
import { ResellerLayout } from "@/components/layout/ResellerLayout";
import { useReseller } from "@/contexts/ResellerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export default function ResellerSettings() {
  const { reseller, refreshReseller } = useReseller();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
    primary_color: "#4F46E5",
    secondary_color: "#06B6D4",
    markup_percentage: 0,
  });

  useEffect(() => {
    if (reseller) {
      setFormData({
        company_name: reseller.company_name,
        contact_email: reseller.contact_email || "",
        contact_phone: reseller.contact_phone || "",
        logo_url: reseller.logo_url || "",
        primary_color: reseller.primary_color,
        secondary_color: reseller.secondary_color,
        markup_percentage: reseller.markup_percentage,
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

  return (
    <ResellerLayout title="Settings" description="Configure your reseller account">
      <div className="max-w-2xl space-y-6">
        {/* Company Info */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Your white-label branding details</CardDescription>
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
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData({ ...formData, logo_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Colors applied to your clients' booking pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
