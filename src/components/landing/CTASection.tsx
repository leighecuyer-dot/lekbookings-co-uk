import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            Ready to elevate
            <br />
            your business?
          </h2>
          
          <p className="mt-8 text-lg text-muted-foreground max-w-xl mx-auto">
            Join thousands of businesses using LEK to streamline their booking experience.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              asChild 
              size="lg" 
              className="h-14 px-8 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-base font-medium rounded-full"
            >
              <Link to="#pricing">View Pricing</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
