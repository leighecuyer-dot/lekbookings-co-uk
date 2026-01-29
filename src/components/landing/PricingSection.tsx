import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Minus, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Feature {
  name: string;
  included: boolean;
  description?: string;
}

interface Plan {
  name: string;
  description: string;
  price: number;
  period: string;
  features: Feature[];
  pageBuilder: string;
  cta: string;
  popular: boolean;
}

const CAMPAIGN_REPORTS_DESCRIPTION = "Track delivery rates, measure conversions, and calculate ROI from your SMS, email, and WhatsApp campaigns.";

const plans: Plan[] = [
  {
    name: "Essential",
    description: "For solo practitioners",
    price: 20,
    period: "month",
    features: [
      { name: "Up to 2 staff members", included: true },
      { name: "Up to 100 bookings/month", included: true },
      { name: "Customer management", included: true },
      { name: "Calendar & scheduling", included: true },
      { name: "50 SMS reminders/month", included: true },
      { name: "Email support", included: true },
      { name: "Branding customization", included: true },
      { name: "Campaign reports", included: false, description: CAMPAIGN_REPORTS_DESCRIPTION },
      { name: "Full content editing", included: false },
    ],
    pageBuilder: "Branding Only",
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing businesses",
    price: 59,
    period: "month",
    features: [
      { name: "Up to 5 staff members", included: true },
      { name: "Unlimited bookings", included: true },
      { name: "200 SMS reminders/month", included: true },
      { name: "Analytics dashboard", included: true },
      { name: "Campaign reports", included: true, description: CAMPAIGN_REPORTS_DESCRIPTION },
      { name: "Priority support", included: true },
      { name: "Branding customization", included: true },
      { name: "Full content editing", included: true },
    ],
    pageBuilder: "Full Content",
    cta: "Start Free",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For larger teams",
    price: 149,
    period: "month",
    features: [
      { name: "Unlimited staff", included: true },
      { name: "Unlimited bookings", included: true },
      { name: "Unlimited SMS reminders", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Campaign reports", included: true, description: CAMPAIGN_REPORTS_DESCRIPTION },
      { name: "API access", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "Complete page builder", included: true },
    ],
    pageBuilder: "Complete Builder",
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-32 relative" id="pricing">
      <div className="container relative mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-6 tracking-tight">
            Choose your tier
          </h2>
          <p className="text-muted-foreground mt-6 text-lg">
            14-day free trial. No credit card required.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative p-8 rounded-2xl border transition-all duration-300",
                plan.popular 
                  ? "bg-foreground text-background border-foreground" 
                  : "bg-background border-border hover:border-foreground/30"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-background text-foreground text-xs font-medium uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className={cn(
                  "text-sm mt-1",
                  plan.popular ? "text-background/70" : "text-muted-foreground"
                )}>{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-display font-bold tracking-tight">£{plan.price}</span>
                <span className={cn(
                  "text-sm ml-1",
                  plan.popular ? "text-background/70" : "text-muted-foreground"
                )}>/{plan.period}</span>
              </div>

              {/* Page Builder Badge */}
              <div className={cn(
                "mb-6 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium",
                plan.popular 
                  ? "bg-background/10 text-background" 
                  : "bg-muted text-foreground"
              )}>
                {plan.pageBuilder}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className={cn(
                        "w-4 h-4 flex-shrink-0",
                        plan.popular ? "text-background" : "text-foreground"
                      )} />
                    ) : (
                      <Minus className={cn(
                        "w-4 h-4 flex-shrink-0",
                        plan.popular ? "text-background/40" : "text-muted-foreground/50"
                      )} />
                    )}
                    <span className={cn(
                      "text-sm flex items-center gap-1.5",
                      !feature.included && (plan.popular ? "text-background/40" : "text-muted-foreground/50")
                    )}>
                      {feature.name}
                      {feature.description && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className={cn(
                              "w-3.5 h-3.5 cursor-help",
                              plan.popular 
                                ? feature.included ? "text-background/60" : "text-background/30"
                                : feature.included ? "text-muted-foreground" : "text-muted-foreground/40"
                            )} />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-[220px] text-xs"
                          >
                            {feature.description}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Button 
                asChild 
                className={cn(
                  "w-full h-12 rounded-full font-medium",
                  plan.popular 
                    ? "bg-background text-foreground hover:bg-background/90" 
                    : "bg-foreground text-background hover:bg-foreground/90"
                )}
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            {["Secure Payment", "Cancel Anytime", "GDPR Compliant", "99.9% Uptime"].map((badge) => (
              <div key={badge} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                {badge}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
