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

const LandingPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, loading: businessLoading } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) return;
    
    if (businesses.length > 0) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/onboarding", { replace: true });
    }
  }, [user, authLoading, businessLoading, businesses, navigate]);
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
