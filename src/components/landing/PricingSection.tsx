import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "Perfect for solo practitioners",
    price: 29,
    period: "month",
    features: [
      "1 staff member",
      "Up to 100 bookings/month",
      "Customer management",
      "Calendar & scheduling",
      "Email support",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing businesses",
    price: 79,
    period: "month",
    features: [
      "Up to 5 staff members",
      "Unlimited bookings",
      "SMS reminders",
      "Analytics dashboard",
      "Custom branding",
      "Priority support",
    ],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Business",
    description: "For larger teams",
    price: 149,
    period: "month",
    features: [
      "Unlimited staff",
      "Unlimited bookings",
      "Advanced analytics",
      "API access",
      "Multiple locations",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 relative overflow-hidden" id="pricing">
      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container relative mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Pricing</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              pricing
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                  ? "bg-card border-primary shadow-xl shadow-primary/10 scale-105" 
                  : "bg-card/50 border-border/50 hover:border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-5xl font-display font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                asChild 
                className={cn(
                  "w-full h-12",
                  plan.popular 
                    ? "gradient-primary shadow-lg shadow-primary/25" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Link to="/auth">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">Trusted by businesses worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {["Secure Payment", "GDPR Compliant", "99.9% Uptime", "24/7 Support"].map((badge) => (
              <div key={badge} className="flex items-center gap-2 text-sm font-medium">
                <Check className="w-4 h-4 text-success" />
                {badge}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
