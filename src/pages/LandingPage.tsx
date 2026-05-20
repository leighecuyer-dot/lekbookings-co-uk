import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";

const LandingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, currentBusiness, loading: businessLoading } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) return;

    if (businesses.length > 0 || currentBusiness) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Defensive double-check before sending to onboarding: if the user
    // actually has a role on a business but the businesses fetch failed
    // or hasn't populated yet, prefer the dashboard.
    let cancelled = false;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("business_id")
        .eq("user_id", user.id)
        .limit(1);
      if (cancelled) return;
      if (roles && roles.length > 0) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, businessLoading, businesses, currentBusiness, navigate]);

  return (
    <div className="min-h-screen bg-background border-x-[20px] border-y-[20px] border-foreground">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <PricingSection />
        <section id="testimonials">
          <TestimonialsSection />
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
