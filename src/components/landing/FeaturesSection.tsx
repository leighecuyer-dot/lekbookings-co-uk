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
    description: "Intuitive drag-and-drop scheduling with conflict detection and real-time availability.",
  },
  {
    icon: Users,
    title: "Customer CRM",
    description: "Build lasting relationships with detailed profiles, history tracking, and notes.",
  },
  {
    icon: Clock,
    title: "Staff Management",
    description: "Manage schedules, assign services, and set individual working hours with ease.",
  },
  {
    icon: Bell,
    title: "SMS Reminders",
    description: "Reduce no-shows by 80% with automated appointment reminders.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track revenue, bookings, and customer trends with actionable insights.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Manage your business on-the-go with our fully responsive experience.",
  },
  {
    icon: Shield,
    title: "Secure",
    description: "Enterprise-grade security with encrypted data and GDPR compliance.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed with instant updates and real-time synchronization.",
  }
];

export function FeaturesSection() {
  return (
    <section className="py-32 relative" id="features">
      <div className="container relative mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Features</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-6 tracking-tight">
            Everything you need
          </h2>
          <p className="text-muted-foreground mt-6 text-lg">
            Powerful tools designed to save time and increase bookings.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-foreground text-background p-8 rounded-3xl hover:scale-[1.02] transition-transform group flex items-start gap-6"
            >
              <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center flex-shrink-0 ring-4 ring-background/20 shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-shadow">
                <feature.icon className="w-8 h-8 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 uppercase tracking-wide">{feature.title}</h3>
                <p className="text-sm text-background/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
