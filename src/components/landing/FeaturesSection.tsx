import { motion } from "framer-motion";
import { 
  Calendar, 
  Users, 
  Clock, 
  Bell, 
  BarChart3, 
  Smartphone,
  Shield,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Calendar",
    description: "Intuitive drag-and-drop scheduling with conflict detection and real-time availability updates.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Users,
    title: "Customer CRM",
    description: "Build lasting relationships with detailed customer profiles, history tracking, and personalized notes.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: Clock,
    title: "Staff Management",
    description: "Manage staff schedules, assign services, and set individual working hours with ease.",
    color: "text-warning",
    bgColor: "bg-warning/10"
  },
  {
    icon: Bell,
    title: "SMS Reminders",
    description: "Reduce no-shows by 80% with automated appointment reminders and confirmations.",
    color: "text-success",
    bgColor: "bg-success/10"
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track revenue, bookings, and customer trends with beautiful, actionable insights.",
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Manage your business on-the-go with our fully responsive mobile experience.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Enterprise-grade security with encrypted data storage and GDPR compliance.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed with instant updates and seamless real-time synchronization.",
    color: "text-warning",
    bgColor: "bg-warning/10"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Features</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-4 mb-6">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              run your business
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful tools designed to save you time, increase bookings, and keep your customers coming back.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
