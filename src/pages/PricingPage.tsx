import { Link } from "react-router-dom";
import { Check, Minus, Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Tier {
  name: string;
  price: string;
  period?: string;
  blurb: string;
  email: string;
  sms: string;
  whatsapp: string;
  customers: string;
  staff: string;
  bookings: string;
  txFee: string;
  features: { label: string; included: boolean }[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: "£0",
    period: "forever",
    blurb: "Try the platform, no card required.",
    email: "Unlimited",
    sms: "—",
    whatsapp: "Click-to-chat link",
    customers: "Unlimited",
    staff: "1 staff member",
    bookings: "Up to 30 / month",
    txFee: "",
    features: [
      { label: "Public booking page", included: true },
      { label: "Calendar & customers", included: true },
      { label: "Email confirmations & reminders", included: true },
      { label: "SMS reminders", included: false },
      { label: "Campaign reports", included: false },
    ],
    cta: "Start free",
    ctaHref: "/auth",
  },
  {
    name: "Essential",
    price: "£25",
    period: "/month",
    blurb: "For solo practitioners getting started.",
    email: "Unlimited",
    sms: "—",
    whatsapp: "Click-to-chat link",
    customers: "Unlimited",
    staff: "Up to 2 staff",
    bookings: "Up to 100 / month",
    txFee: "",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Branding customization", included: true },
      { label: "Email support", included: true },
      { label: "SMS reminders", included: false },
      { label: "Campaign reports", included: false },
    ],
    cta: "Start free trial",
    ctaHref: "/auth",
  },
  {
    name: "Pro",
    price: "£51",
    period: "/month",
    blurb: "For growing teams who need automation.",
    email: "Unlimited",
    sms: "50 SMS / month included",
    whatsapp: "Click-to-chat link",
    customers: "Unlimited",
    staff: "Up to 5 staff",
    bookings: "Unlimited",
    txFee: "",
    features: [
      { label: "Everything in Essential", included: true },
      { label: "Automated SMS reminders", included: true },
      { label: "Campaign reports", included: true },
      { label: "Analytics dashboard", included: true },
      { label: "Priority support", included: true },
    ],
    cta: "Start free trial",
    ctaHref: "/auth",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "£149",
    period: "/month",
    blurb: "For larger teams with bigger volumes.",
    email: "Unlimited",
    sms: "200 SMS / month included",
    whatsapp: "Click-to-chat link",
    customers: "Unlimited",
    staff: "Unlimited staff",
    bookings: "Unlimited",
    txFee: "0.5%",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "API access", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Complete page builder", included: true },
    ],
    cta: "Contact sales",
    ctaHref: "/auth",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-6 py-20">
        <header className="max-w-3xl mx-auto text-center mb-16">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
            Simple pricing. Clear message limits.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Every plan includes unlimited email and unlimited customers.
            SMS is bundled on Pro and Enterprise. WhatsApp is a free click-to-chat
            link on every plan — your customers tap it and message you directly.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={cn(
                "rounded-3xl border-2 border-foreground bg-card p-6 flex flex-col",
                t.highlight && "ring-4 ring-foreground/10 shadow-[8px_8px_0_0_hsl(var(--foreground))]"
              )}
            >
              {t.highlight && (
                <div className="mb-3 inline-block self-start rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider text-background">
                  Most popular
                </div>
              )}
              <h2 className="text-2xl font-bold">{t.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.price}</span>
                {t.period && (
                  <span className="text-sm text-muted-foreground">{t.period}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Transaction fee: <span className="font-medium text-foreground">{t.txFee}</span>
              </p>

              <div className="mt-6 space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                <Row icon={<Users className="h-4 w-4" />} label="Customers" value={t.customers} />
                <Row icon={<Mail className="h-4 w-4" />} label="Email" value={t.email} />
                <Row icon={<Phone className="h-4 w-4" />} label="SMS" value={t.sms} />
                <Row icon={<MessageSquare className="h-4 w-4" />} label="WhatsApp" value={t.whatsapp} />
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="text-muted-foreground">{t.staff}</li>
                <li className="text-muted-foreground">{t.bookings} bookings</li>
                {t.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included ? (
                      <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <Minus className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
                    )}
                    <span className={cn(!f.included && "text-muted-foreground/70")}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                <Button asChild className="w-full" variant={t.highlight ? "default" : "outline"}>
                  <Link to={t.ctaHref}>{t.cta}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          Need more SMS? Top-ups available at £0.04 per UK SMS. Email, customers,
          and WhatsApp click-to-chat are always unlimited on every paid plan.
        </p>
      </section>
    </main>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
