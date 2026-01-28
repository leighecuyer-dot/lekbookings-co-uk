import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useReseller } from "@/contexts/ResellerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Palette, Check, ArrowRight, ArrowLeft, Upload, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "company" | "branding" | "confirm";

interface FormData {
  companyName: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  markupPercentage: number;
  supportEmail: string;
  websiteUrl: string;
}

export default function ResellerOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reseller, needsOnboarding, refreshReseller } = useReseller();
  const [step, setStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    slug: "",
    contactEmail: user?.email || "",
    contactPhone: "",
    logoUrl: "",
    primaryColor: "#4F46E5",
    secondaryColor: "#06B6D4",
    markupPercentage: 20,
    supportEmail: "",
    websiteUrl: "",
  });

  // Pre-fill form if reseller exists but needs onboarding (missing logo)
  useEffect(() => {
    if (reseller && needsOnboarding) {
      setIsUpdate(true);
      setFormData({
        companyName: reseller.company_name,
        slug: reseller.slug,
        contactEmail: reseller.contact_email || user?.email || "",
        contactPhone: reseller.contact_phone || "",
        logoUrl: reseller.logo_url || "",
        primaryColor: reseller.primary_color || "#4F46E5",
        secondaryColor: reseller.secondary_color || "#06B6D4",
        markupPercentage: reseller.markup_percentage || 20,
        supportEmail: (reseller.settings as Record<string, string>)?.support_email || "",
        websiteUrl: (reseller.settings as Record<string, string>)?.website_url || "",
      });
    }
  }, [reseller, needsOnboarding, user]);

  const steps: { key: Step; title: string; icon: React.ReactNode }[] = [
    { key: "company", title: "Company Details", icon: <Building2 className="h-5 w-5" /> },
    { key: "branding", title: "White-Label Branding", icon: <Palette className="h-5 w-5" /> },
    { key: "confirm", title: "Confirm", icon: <Check className="h-5 w-5" /> },
  ];

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCompanyNameChange = (value: string) => {
    setFormData({
      ...formData,
      companyName: value,
      slug: generateSlug(value),
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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

      setFormData({ ...formData, logoUrl: urlData.publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateCompanyStep = () => {
    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      return false;
    }
    if (!formData.slug.trim()) {
      toast.error("URL slug is required");
      return false;
    }
    if (formData.slug.length < 3) {
      toast.error("URL slug must be at least 3 characters");
      return false;
    }
    return true;
  };

  const validateBrandingStep = () => {
    if (!formData.logoUrl) {
      toast.error("Company logo is required for white-label branding");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === "company" && !validateCompanyStep()) return;
    if (step === "branding" && !validateBrandingStep()) return;
    
    if (step === "company") setStep("branding");
    else if (step === "branding") setStep("confirm");
  };

  const handleBack = () => {
    if (step === "branding") setStep("company");
    else if (step === "confirm") setStep("branding");
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!formData.logoUrl) {
      toast.error("Logo is required");
      setStep("branding");
      return;
    }

    setLoading(true);
    try {
      const settingsData = {
        support_email: formData.supportEmail || null,
        website_url: formData.websiteUrl || null,
      };

      if (isUpdate && reseller) {
        // Update existing reseller
        const { error } = await supabase
          .from("resellers")
          .update({
            company_name: formData.companyName,
            slug: formData.slug,
            contact_email: formData.contactEmail || null,
            contact_phone: formData.contactPhone || null,
            logo_url: formData.logoUrl,
            primary_color: formData.primaryColor,
            secondary_color: formData.secondaryColor,
            markup_percentage: formData.markupPercentage,
            settings: { ...reseller.settings, ...settingsData },
          })
          .eq("id", reseller.id);

        if (error) throw error;
        
        await refreshReseller();
        toast.success("Branding setup complete!");
      } else {
        // Create new reseller
        const { error } = await supabase.from("resellers").insert({
          user_id: user.id,
          company_name: formData.companyName,
          slug: formData.slug,
          contact_email: formData.contactEmail || null,
          contact_phone: formData.contactPhone || null,
          logo_url: formData.logoUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          markup_percentage: formData.markupPercentage,
          is_active: true,
          settings: settingsData,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("You already have a reseller account");
          } else if (error.message.includes("resellers_slug_key")) {
            toast.error("This URL slug is already taken");
          } else {
            throw error;
          }
          return;
        }

        toast.success("Reseller account created successfully!");
      }
      
      navigate("/reseller");
    } catch (error) {
      console.error("Error saving reseller:", error);
      toast.error("Failed to save reseller account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step === s.key
                    ? "bg-primary border-primary text-primary-foreground"
                    : steps.findIndex((st) => st.key === step) > index
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {s.icon}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    steps.findIndex((st) => st.key === step) > index
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">
              {step === "company" && "Company Details"}
              {step === "branding" && "Brand Your Portal"}
              {step === "confirm" && "Confirm & Launch"}
            </CardTitle>
            <CardDescription>
              {step === "company" && "Tell us about your company"}
              {step === "branding" && "Customize the look and feel for your clients"}
              {step === "confirm" && "Review your settings before going live"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Company Details Step */}
            {step === "company" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Solutions"
                    value={formData.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Partner URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">yoursite.com/partner/</span>
                    <Input
                      id="slug"
                      placeholder="acme-solutions"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="partner@company.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Branding Step */}
            {step === "branding" && (
              <div className="space-y-6">
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Your branding will appear on all customer-facing emails and communications. 
                    This ensures your clients see your brand, not ours.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Company Logo <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    This logo will appear in email headers sent to your customers
                  </p>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="w-16 h-16 rounded-lg object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center border-2 border-dashed border-destructive/50">
                        <Building2 className="h-8 w-8 text-destructive/50" />
                      </div>
                    )}
                    <div>
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingLogo ? "Uploading..." : formData.logoUrl ? "Change Logo" : "Upload Logo"}
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 2MB. Recommended: 200x200px or larger
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportEmail">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Customer Support Email
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@yourcompany.com"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown in email footers as the reply-to address for your customers
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="primaryColor"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markup">Default Markup Percentage</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="markup"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.markupPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, markupPercentage: Number(e.target.value) })
                      }
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be added on top of base pricing for your clients
                  </p>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium mb-3">Brand Preview</p>
                  <div className="flex items-center gap-3">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-10 h-10 rounded" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        {formData.companyName.charAt(0) || "?"}
                      </div>
                    )}
                    <span className="font-semibold">{formData.companyName || "Your Company"}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div
                      className="px-4 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: formData.secondaryColor }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Step */}
            {step === "confirm" && (
              <div className="space-y-6">
                <div className="rounded-lg border divide-y">
                  <div className="p-4 flex items-center gap-4">
                    {formData.logoUrl && (
                      <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Company Name</p>
                      <p className="font-medium">{formData.companyName}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Partner URL</p>
                    <p className="font-medium">yoursite.com/partner/{formData.slug}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Contact Details</p>
                    <p className="font-medium">
                      {formData.contactEmail || "Not set"}
                      {formData.contactPhone && ` • ${formData.contactPhone}`}
                    </p>
                  </div>
                  {formData.supportEmail && (
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">Customer Support Email</p>
                      <p className="font-medium">{formData.supportEmail}</p>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">Brand Colors & Pricing</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: formData.primaryColor }}
                      />
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: formData.secondaryColor }}
                      />
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm">{formData.markupPercentage}% markup</span>
                    </div>
                  </div>
                </div>

                <Alert className="border-primary/30 bg-primary/5">
                  <Check className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    All emails sent to your customers will display your logo and branding. 
                    You can update these settings anytime from your reseller dashboard.
                  </AlertDescription>
                </Alert>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground">
                    By {isUpdate ? "completing setup" : "creating your reseller account"}, you agree to our partner terms and conditions.
                    You'll be able to start adding clients immediately after setup.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step !== "company" ? (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step !== "confirm" ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="gradient-primary">
                  {loading ? "Saving..." : isUpdate ? "Complete Setup" : "Create Reseller Account"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
