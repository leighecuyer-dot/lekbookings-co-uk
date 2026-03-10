import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Check,
  ArrowRight,
  Clock,
  MessageCircle,
  Palette,
  Users,
  Share2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  link?: string;
  action?: () => void;
}

export default function WelcomeSetupPage() {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const navigate = useNavigate();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!currentBusiness) return;

    // Check existing progress
    const checkProgress = async () => {
      const completed = new Set<string>();

      // Check if staff have working hours
      const { data: staff } = await supabase
        .from("staff")
        .select("id, working_hours")
        .eq("business_id", currentBusiness.id)
        .limit(10);

      if (staff?.some((s) => s.working_hours)) {
        completed.add("working-hours");
      }

      // Check WhatsApp
      const settings = currentBusiness.settings as Record<string, unknown> | null;
      const socialLinks = settings?.socialLinks as Record<string, string> | undefined;
      if (socialLinks?.whatsapp) {
        completed.add("whatsapp");
        setWhatsappNumber(socialLinks.whatsapp);
        setWhatsappSaved(true);
      }

      // Check theme/branding
      const { data: theme } = await supabase
        .from("page_themes")
        .select("id, logo_url, primary_color")
        .eq("business_id", currentBusiness.id)
        .maybeSingle();

      if (theme?.logo_url || theme?.primary_color) {
        completed.add("branding");
      }

      // Check if more than 1 staff
      if (staff && staff.length > 1) {
        completed.add("team");
      }

      setCompletedSteps(completed);
    };

    checkProgress();
  }, [user, currentBusiness, navigate]);

  const handleSaveWhatsApp = async () => {
    if (!currentBusiness || !whatsappNumber.trim()) return;

    setSavingWhatsapp(true);
    const existingSettings = (currentBusiness.settings as Record<string, unknown>) || {};
    const existingSocial = (existingSettings.socialLinks as Record<string, string>) || {};

    const { error } = await supabase
      .from("businesses")
      .update({
        settings: {
          ...existingSettings,
          socialLinks: { ...existingSocial, whatsapp: whatsappNumber.trim() },
        } as unknown as null,
      })
      .eq("id", currentBusiness.id);

    if (error) {
      toast.error("Failed to save WhatsApp number");
    } else {
      toast.success("WhatsApp number saved! The chat button is now on your booking page.");
      setWhatsappSaved(true);
      setCompletedSteps((prev) => new Set([...prev, "whatsapp"]));
    }
    setSavingWhatsapp(false);
  };

  const handleCopyBookingLink = () => {
    if (!currentBusiness) return;
    const url = `${window.location.origin}/book/${currentBusiness.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied!");
    setCompletedSteps((prev) => new Set([...prev, "share"]));
  };

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your business...</p>
      </div>
    );
  }

  const steps: SetupStep[] = [
    {
      id: "working-hours",
      title: "Set your working hours",
      description: "Tell customers when you're available for bookings",
      icon: Clock,
      link: "/staff",
    },
    {
      id: "whatsapp",
      title: "Add your WhatsApp number",
      description: "Let customers message you directly from your booking page",
      icon: MessageCircle,
    },
    {
      id: "branding",
      title: "Customise your booking page",
      description: "Upload your logo, set colours, and add gallery photos",
      icon: Palette,
      link: "/settings",
    },
    {
      id: "team",
      title: "Invite your team",
      description: "Add staff members so they get their own logins and schedules",
      icon: Users,
      link: "/staff",
    },
    {
      id: "share",
      title: "Share your booking link",
      description: "Copy your link and share it on social media",
      icon: Share2,
    },
  ];

  const completedCount = steps.filter((s) => completedSteps.has(s.id)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Welcome, {currentBusiness.name}! 🎉
              </h1>
              <p className="text-muted-foreground mt-1">
                Let's get your booking system ready for customers
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {steps.map((step) => {
          const isCompleted = completedSteps.has(step.id);
          const Icon = step.icon;

          return (
            <Card
              key={step.id}
              className={`border transition-all ${
                isCompleted ? "bg-muted/30 border-muted" : "border-border shadow-soft"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold ${
                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>

                    {/* Inline WhatsApp form */}
                    {step.id === "whatsapp" && !isCompleted && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="+447700123456"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="max-w-[240px]"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveWhatsApp}
                          disabled={!whatsappNumber.trim() || savingWhatsapp}
                        >
                          {savingWhatsapp ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    )}

                    {/* Share booking link */}
                    {step.id === "share" && !isCompleted && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCopyBookingLink}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Copy booking link
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.open(`/book/${currentBusiness.slug}`, "_blank")
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    )}

                    {/* Navigation link for other steps */}
                    {step.link && !isCompleted && step.id !== "whatsapp" && step.id !== "share" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => navigate(step.link!)}
                      >
                        Go to {step.title.toLowerCase()}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* All done */}
        {completedCount === steps.length && (
          <Card className="border-0 shadow-soft bg-primary text-primary-foreground">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-lg font-display font-bold">You're all set!</h3>
              <p className="text-sm opacity-80 mt-1 mb-4">
                Your booking system is ready. Customers can now book online.
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
