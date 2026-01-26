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
import { Building2, ArrowRight } from "lucide-react";

const INDUSTRIES = [
  { value: "hair_salon", label: "Hair Salon" },
  { value: "barbershop", label: "Barbershop" },
  { value: "nail_salon", label: "Nail Salon" },
  { value: "spa", label: "Spa / Wellness" },
  { value: "massage", label: "Massage Therapy" },
  { value: "med_spa", label: "Med Spa / Aesthetics" },
  { value: "dental", label: "Dental Clinic" },
  { value: "medical", label: "Medical Practice" },
  { value: "fitness", label: "Fitness / Personal Training" },
  { value: "yoga", label: "Yoga / Pilates Studio" },
  { value: "consulting", label: "Consulting / Coaching" },
  { value: "education", label: "Tutoring / Education" },
  { value: "photography", label: "Photography Studio" },
  { value: "tattoo", label: "Tattoo / Piercing Studio" },
  { value: "pet_grooming", label: "Pet Grooming" },
  { value: "home_services", label: "Home Services (Cleaning, Repair)" },
  { value: "automotive", label: "Automotive Services" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const navigate = useNavigate();
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be signed in to create a business.");
      navigate("/auth");
      return;
    }
    
    setLoading(true);
    
    try {
      const slug = generateSlug(businessName);

      // Create the business AND assign the current user as owner (atomic, secure)
      const { data: business, error: businessError } = await supabase.rpc(
        "create_business_with_owner",
        {
          _name: businessName,
          _slug: slug,
          _industry: industry,
          _phone: phone,
        }
      );

      if (businessError) throw businessError;
      if (!business) throw new Error("Failed to create business");

      // Refresh businesses and navigate
      await refreshBusinesses();
      toast.success("Business created successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create business";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
            Tell us about your business to get started with BookFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name *</Label>
              <Input
                id="business-name"
                type="text"
                placeholder="My Awesome Salon"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select value={industry} onValueChange={setIndustry} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-primary hover:opacity-90"
              disabled={loading || !businessName || !industry}
            >
              {loading ? "Creating..." : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
