import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  { value: "salon", label: "Hair Salon / Barbershop" },
  { value: "spa", label: "Spa & Wellness" },
  { value: "medical", label: "Medical / Dental" },
  { value: "fitness", label: "Fitness / Personal Training" },
  { value: "consulting", label: "Consulting / Professional Services" },
  { value: "education", label: "Tutoring / Education" },
  { value: "photography", label: "Photography / Creative" },
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      + "-" + Math.random().toString(36).substring(2, 8);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Create the business
      const slug = generateSlug(businessName);
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          name: businessName,
          slug,
          industry,
          phone,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Create owner role for the user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          business_id: business.id,
          role: "owner",
        });

      if (roleError) throw roleError;

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
