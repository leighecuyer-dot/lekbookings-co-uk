interface Business {
  name: string;
}

interface BookingFooterProps {
  business: Business;
}

export function BookingFooter({ business }: BookingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-muted/50 border-t border-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            © {currentYear} {business.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Powered by{" "}
            <a
              href="/"
              className="font-semibold hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              LEK
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
