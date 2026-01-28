import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useIndustries } from "@/hooks/useIndustries";

const STEPS = [
  { id: 1, title: "Business Name", description: "What's your business called?" },
  { id: 2, title: "Industry", description: "What type of business do you run?" },
  { id: 3, title: "Contact", description: "How can customers reach you?" },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const navigate = useNavigate();
  const { industries } = useIndustries();
  
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-display">Sign in required</CardTitle>
            <CardDescription>
              Please sign in first, then come back to set up your business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full gradient-primary hover:opacity-90" asChild>
              <Link to="/auth">
                Go to Sign In
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      + "-" + Math.random().toString(36).substring(2, 8);
  };

  const formatCreateBusinessError = (err: unknown) => {
    if (!err) return "Failed to create business";
    if (err instanceof Error) return err.message || "Failed to create business";
    if (typeof err === "string") return err;
    if (typeof err === "object") {
      const e = err as Record<string, unknown>;
      const message = typeof e.message === "string" ? e.message : undefined;
      const details = typeof e.details === "string" ? e.details : undefined;
      const hint = typeof e.hint === "string" ? e.hint : undefined;
      return [message, details, hint].filter(Boolean).join(" — ") || "Failed to create business";
    }
    return "Failed to create business";
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in to create a business.");
      navigate("/auth");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Your session isn't active yet. Please sign in again and retry.");
      }

      const slug = generateSlug(businessName);

      const { data: business, error: businessError } = await supabase.rpc(
        "create_business_with_owner",
        {
          _name: businessName,
          _slug: slug,
          _industry: industry,
          _phone: phone,
        }
      );

      if (businessError) {
        console.error("create_business_with_owner error:", businessError);
        throw businessError;
      }
      if (!business) throw new Error("Failed to create business");

      await refreshBusinesses();
      toast.success("Business created successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Create business failed:", error);
      toast.error(formatCreateBusinessError(error));
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return businessName.trim().length > 0;
      case 2: return industry.length > 0;
      case 3: return true; // Phone is optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-display">Set up your business</CardTitle>
          <CardDescription>
            Tell us about your business to get started with LEK
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step > s.id
                      ? "bg-primary text-primary-foreground"
                      : step === s.id
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded-full ${
                      step > s.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1: Business Name */}
            {step === 1 && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label htmlFor="business-name">Business Name *</Label>
                <Input
                  id="business-name"
                  type="text"
                  placeholder="My Awesome Salon"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Step 2: Industry */}
            {step === 2 && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 3 && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label htmlFor="phone">Business Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Customers will use this to contact you
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
              )}
              <Button
                type="button"
                className={`gradient-primary hover:opacity-90 ${step === 1 ? "w-full" : "flex-1"}`}
                disabled={loading || !canProceed()}
                onClick={handleNext}
              >
                {loading ? "Creating..." : step === 3 ? (
                  <>
                    Complete Setup
                    <Check className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
