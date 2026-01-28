import { Building2, MapPin, Phone, Mail } from "lucide-react";

interface Business {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  industry: string | null;
}

interface PageTheme {
  primary_color: string | null;
  secondary_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

interface BookingHeroProps {
  business: Business;
  logoUrl: string | null;
  theme: PageTheme | null;
}

export function BookingHero({ business, logoUrl, theme }: BookingHeroProps) {
  const primaryColor = theme?.primary_color || "#4F46E5";
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  return (
    <header
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "#fff" }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: "#fff" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center text-white">
          {/* Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${business.name} logo`}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover mb-6 shadow-2xl border-4 border-white/20"
            />
          ) : (
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border-4 border-white/20"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-white/80" />
            </div>
          )}

          {/* Business Name */}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: fontHeading }}
          >
            {business.name}
          </h1>

          {/* Industry Tag */}
          {business.industry && (
            <span
              className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-6"
              style={{ 
                backgroundColor: "rgba(255,255,255,0.2)",
                fontFamily: fontBody 
              }}
            >
              {business.industry}
            </span>
          )}

          {/* Contact Info */}
          <div
            className="flex flex-wrap justify-center gap-4 sm:gap-6 text-white/90"
            style={{ fontFamily: fontBody }}
          >
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">{business.phone}</span>
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">{business.email}</span>
              </a>
            )}
            {business.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{business.address}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <button
            className="mt-8 px-8 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            style={{
              backgroundColor: "#fff",
              color: primaryColor,
              fontFamily: fontBody,
            }}
          >
            Book an Appointment
          </button>
        </div>
      </div>
    </header>
  );
}
