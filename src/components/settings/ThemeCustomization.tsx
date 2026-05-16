import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Upload, Building2, Crop } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Poppins", label: "Poppins" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "GFS Didot, Didot, serif", label: "Didot" },
];

interface PageTheme {
  id: string;
  business_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_heading: string | null;
  font_body: string | null;
  custom_css: string | null;
}

export function ThemeCustomization() {
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [theme, setTheme] = useState<PageTheme | null>(null);
  
  const [formData, setFormData] = useState({
    logo_url: "",
    primary_color: "#4F46E5",
    secondary_color: "#06B6D4",
    accent_color: "#F59E0B",
    font_heading: "Plus Jakarta Sans",
    font_body: "Inter",
  });

  useEffect(() => {
    if (currentBusiness) {
      fetchTheme();
    }
  }, [currentBusiness]);

  // Dynamically load Google Fonts for the chosen heading/body so the
  // live preview (and the rest of the page) reflects the selection
  // instantly — no manual refresh needed after Save.
  useEffect(() => {
    const pickFirst = (stack?: string | null) =>
      (stack || "").split(",")[0].trim().replace(/['"]/g, "");
    const families = [pickFirst(formData.font_heading), pickFirst(formData.font_body)]
      .filter(Boolean)
      .filter((f) => !/^(serif|sans-serif|monospace|system-ui|didot)$/i.test(f));
    if (families.length === 0) return;

    const id = `tc-fonts-${families.join("-").replace(/\s+/g, "+")}`;
    if (document.getElementById(id)) return;

    const href = `https://fonts.googleapis.com/css2?${families
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`)
      .join("&")}&display=swap`;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [formData.font_heading, formData.font_body]);

  const fetchTheme = async () => {
    if (!currentBusiness) return;

    const { data, error } = await supabase
      .from("page_themes")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching theme:", error);
      return;
    }

    if (data) {
      setTheme(data);
      setFormData({
        logo_url: data.logo_url || "",
        primary_color: data.primary_color || "#4F46E5",
        secondary_color: data.secondary_color || "#06B6D4",
        accent_color: data.accent_color || "#F59E0B",
        font_heading: data.font_heading || "Plus Jakarta Sans",
        font_body: data.font_body || "Inter",
      });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file later
    if (!file || !currentBusiness) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleEditExisting = () => {
    if (!formData.logo_url) return;
    // Cache-bust so the cropper always pulls a fresh copy
    setCropSrc(`${formData.logo_url}?t=${Date.now()}`);
    setCropOpen(true);
  };

  const uploadCroppedBlob = async (blob: Blob) => {
    if (!currentBusiness) return;
    setUploadingLogo(true);
    try {
      const filePath = `${currentBusiness.id}/logos/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, blob, { contentType: "image/png", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("business-assets")
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      toast.success("Logo updated — don't forget to Save");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!currentBusiness) return;
    
    setLoading(true);
    try {
      if (theme) {
        // Update existing theme
        const { error } = await supabase
          .from("page_themes")
          .update({
            logo_url: formData.logo_url || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            font_heading: formData.font_heading,
            font_body: formData.font_body,
          })
          .eq("id", theme.id);

        if (error) throw error;
      } else {
        // Create new theme
        const { error } = await supabase
          .from("page_themes")
          .insert({
            business_id: currentBusiness.id,
            logo_url: formData.logo_url || null,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            accent_color: formData.accent_color,
            font_heading: formData.font_heading,
            font_body: formData.font_body,
          });

        if (error) throw error;
      }

      toast.success("Theme settings saved!");
      fetchTheme();
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error("Failed to save theme settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Booking Page Theme</CardTitle>
        </div>
        <CardDescription>
          Customize the look and feel of your public booking page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Business Logo</Label>
          <div className="flex items-center gap-4">
            {formData.logo_url ? (
              <img
                src={formData.logo_url}
                alt="Business logo"
                className="w-16 h-16 rounded-lg object-cover border-2 border-primary"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Label
                  htmlFor="business-logo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? "Uploading..." : formData.logo_url ? "Change" : "Upload"}
                </Label>
                {formData.logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEditExisting}
                    disabled={uploadingLogo}
                  >
                    <Crop className="h-4 w-4 mr-1.5" />
                    Edit / Crop
                  </Button>
                )}
              </div>
              <input
                id="business-logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
                disabled={uploadingLogo}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 20MB. You can crop after upload.
              </p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Fonts */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Heading Font</Label>
            <Select
              value={formData.font_heading}
              onValueChange={(v) => setFormData({ ...formData, font_heading: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Body Font</Label>
            <Select
              value={formData.font_body}
              onValueChange={(v) => setFormData({ ...formData, font_body: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">Theme Preview:</p>
          <div className="flex items-center gap-4 mb-4">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: formData.primary_color }}
              >
                B
              </div>
            )}
            <span className="font-semibold" style={{ fontFamily: formData.font_heading }}>
              Your Business
            </span>
          </div>
          <div className="flex gap-2">
            <div
              className="px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: formData.primary_color }}
            >
              Primary
            </div>
            <div
              className="px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: formData.secondary_color }}
            >
              Secondary
            </div>
            <div
              className="px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: formData.accent_color }}
            >
              Accent
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="gradient-primary">
          {loading ? "Saving..." : "Save Theme Settings"}
        </Button>
      </CardContent>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropSrc}
        aspect={1}
        outputSize={512}
        title="Crop Your Logo"
        onCropComplete={uploadCroppedBlob}
      />
    </Card>
  );
}
