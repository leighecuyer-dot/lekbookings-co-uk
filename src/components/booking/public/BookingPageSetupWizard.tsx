import { Link } from "react-router-dom";
import { Palette, Briefcase, Globe, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SetupStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  action: string;
}

const steps: SetupStep[] = [
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "Add Your Services",
    description: "List the services you offer with pricing and duration so customers can book them.",
    href: "/services",
    action: "Add Services",
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: "Customise Your Page",
    description: "Add your logo, brand colours, and choose fonts to make your page look professional.",
    href: "/settings",
    action: "Go to Settings",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Share Your Link",
    description: "Once set up, share your booking page link with customers via WhatsApp, Instagram, or email.",
    href: "/settings",
    action: "Get Your Link",
  },
];

interface BookingPageSetupWizardProps {
  businessName: string;
  primaryColor: string;
}

export function BookingPageSetupWizard({ businessName, primaryColor }: BookingPageSetupWizardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Welcome to {businessName}! 🎉
          </h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Your booking page is almost ready. Follow these 3 simple steps to get set up.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-10">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-5"
            >
              {/* Step number + icon */}
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  {step.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <Link to={step.href}>
                  <Button
                    size="sm"
                    className="whitespace-nowrap text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {step.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-400 bg-white px-5 py-2.5 rounded-full shadow-sm border border-slate-100">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            This page is only shown to you — customers won't see it until services are added
          </div>
        </div>
      </div>
    </div>
  );
}
