import { Phone, Mail, MapPin, Clock } from "lucide-react";

interface Business {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface PageTheme {
  primary_color: string | null;
  secondary_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

interface BookingContactProps {
  business: Business;
  theme: PageTheme | null;
}

export function BookingContact({ business, theme }: BookingContactProps) {
  const primaryColor = theme?.primary_color || "#4F46E5";
  const secondaryColor = theme?.secondary_color || "#06B6D4";
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  const hasContactInfo = business.phone || business.email || business.address;

  if (!hasContactInfo) return null;

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: fontHeading }}
          >
            Get in Touch
          </h2>
          <p
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{ fontFamily: fontBody }}
          >
            Have questions? We're here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="group flex flex-col items-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Phone className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3
                className="font-semibold text-foreground mb-1"
                style={{ fontFamily: fontHeading }}
              >
                Phone
              </h3>
              <p
                className="text-muted-foreground text-sm"
                style={{ fontFamily: fontBody }}
              >
                {business.phone}
              </p>
            </a>
          )}

          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="group flex flex-col items-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${secondaryColor}15` }}
              >
                <Mail className="w-6 h-6" style={{ color: secondaryColor }} />
              </div>
              <h3
                className="font-semibold text-foreground mb-1"
                style={{ fontFamily: fontHeading }}
              >
                Email
              </h3>
              <p
                className="text-muted-foreground text-sm"
                style={{ fontFamily: fontBody }}
              >
                {business.email}
              </p>
            </a>
          )}

          {business.address && (
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card border border-border">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3
                className="font-semibold text-foreground mb-1"
                style={{ fontFamily: fontHeading }}
              >
                Location
              </h3>
              <p
                className="text-muted-foreground text-sm text-center"
                style={{ fontFamily: fontBody }}
              >
                {business.address}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
