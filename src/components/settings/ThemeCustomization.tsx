import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Upload, Building2 } from "lucide-react";

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

type LogoSize = "small" | "medium" | "large";

const LOGO_SIZE_OPTIONS: Array<{ value: LogoSize; label: string; className: string }> = [
  { value: "small", label: "Small", className: "w-8 h-8" },
  { value: "medium", label: "Medium", className: "w-10 h-10" },
  { value: "large", label: "Large", className: "w-12 h-12" },
];

const getLogoSizeFromCustomCss = (customCss?: string | null): LogoSize => {
  const match = customCss?.match(/logo-size:(small|medium|large)/i);
  return (match?.[1]?.toLowerCase() as LogoSize | undefined) || "medium";
};

const setLogoSizeInCustomCss = (customCss: string | null | undefined, size: LogoSize) => {
  const withoutOldSize = (customCss || "").replace(/\s*\/\*\s*logo-size:(small|medium|large)\s*\*\//gi, "").trim();
  return `${withoutOldSize}${withoutOldSize ? "\n" : ""}/* logo-size:${size} */`;
};

export function ThemeCustomization() {
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [theme, setTheme] = useState<PageTheme | null>(null);
  
  const [formData, setFormData] = useState({
    logo_url: "",
    logo_size: "medium" as LogoSize,
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
        logo_size: getLogoSizeFromCustomCss(data.custom_css),
        primary_color: data.primary_color || "#4F46E5",
        secondary_color: data.secondary_color || "#06B6D4",
        accent_color: data.accent_color || "#F59E0B",
        font_heading: data.font_heading || "Plus Jakarta Sans",
        font_body: data.font_body || "Inter",
      });
    }
  };

  const prepareLogoForUpload = async (file: File, maxDim = 1200): Promise<{ blob: Blob; contentType: string; extension: string }> => {
    const originalUrl = URL.createObjectURL(file);
    try {
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = originalUrl;
      });

      const { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height || (width <= maxDim && height <= maxDim)) {
        return {
          blob: file,
          contentType: file.type || "image/png",
          extension: file.type === "image/jpeg" ? "jpg" : "png",
        };
      }

      const scale = Math.min(maxDim / width, maxDim / height);
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return originalUrl;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, 0.9)
      );
      if (!blob) {
        return {
          blob: file,
          contentType: file.type || "image/png",
          extension: file.type === "image/jpeg" ? "jpg" : "png",
        };
      }

      return {
        blob,
        contentType: mime,
        extension: mime === "image/jpeg" ? "jpg" : "png",
      };
    } catch (error) {
      console.error("Logo preparation failed:", error);
      return {
        blob: file,
        contentType: file.type || "image/png",
        extension: file.type === "image/jpeg" ? "jpg" : "png",
      };
    } finally {
      URL.revokeObjectURL(originalUrl);
    }
  };

  const uploadLogoBlob = async (blob: Blob, contentType: string, extension: string) => {
    if (!currentBusiness) return;

    const filePath = `${currentBusiness.id}/logos/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(filePath, blob, { contentType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("business-assets")
      .getPublicUrl(filePath);

    setFormData((current) => ({ ...current, logo_url: urlData.publicUrl }));
    toast.success("Logo uploaded — don't forget to Save");
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file later
    if (!file || !currentBusiness) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Logo must be less than 10MB. Try a smaller PNG or JPG.");
      return;
    }

    setUploadingLogo(true);
    prepareLogoForUpload(file)
      .then(({ blob, contentType, extension }) => {
        return uploadLogoBlob(blob, contentType, extension);
      })
      .catch(() => {
        toast.error("Couldn't upload that logo. Try a PNG or JPG instead.");
      })
      .finally(() => setUploadingLogo(false));
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
            custom_css: setLogoSizeInCustomCss(theme.custom_css, formData.logo_size),
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
            custom_css: setLogoSizeInCustomCss(null, formData.logo_size),
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
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-60"
                  aria-disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? "Uploading..." : formData.logo_url ? "Change" : "Upload"}
                </Label>
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

        <div className="space-y-2">
          <Label>Logo Size</Label>
          <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
            {LOGO_SIZE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={formData.logo_size === option.value ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, logo_size: option.value })}
                disabled={uploadingLogo}
              >
                {option.label}
              </Button>
            ))}
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
              <img
                src={formData.logo_url}
                alt="Logo"
                className={`${LOGO_SIZE_OPTIONS.find((option) => option.value === formData.logo_size)?.className || "w-10 h-10"} rounded object-contain bg-background`}
              />
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
    </Card>
  );
}
