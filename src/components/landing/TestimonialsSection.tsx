import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Salon Owner",
    company: "Luxe Hair Studio",
    content: "LEK has completely transformed how we manage appointments. Our no-shows dropped by 70%. The interface is beautiful and my staff picked it up in minutes.",
    avatar: "SM"
  },
  {
    name: "Marcus Chen",
    role: "Clinic Director",
    company: "Wellness First",
    content: "The customer management features are incredible. We can track everything from visit history to preferences. It's like having a personal assistant for every patient.",
    avatar: "MC"
  },
  {
    name: "Emma Rodriguez",
    role: "Spa Manager",
    company: "Tranquil Spa",
    content: "We switched from a legacy system and the difference is night and day. LEK is fast, reliable, and the analytics help us make smarter business decisions.",
    avatar: "ER"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-32 bg-foreground text-background relative" id="testimonials">
      <div className="container relative mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-background/60">Testimonials</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mt-6 tracking-tight">
            Loved by businesses
          </h2>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-2xl bg-background/5 border border-background/10 hover:bg-background/10 transition-colors"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-background/20 mb-6" />

              {/* Content */}
              <p className="text-background/80 leading-relaxed mb-8">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-background/10 flex items-center justify-center font-medium text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-medium">{testimonial.name}</p>
                  <p className="text-sm text-background/60">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
