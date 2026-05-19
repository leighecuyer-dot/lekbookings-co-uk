import { Building2, MapPin, Phone, Mail, Loader2 } from "lucide-react";

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
  isLoading?: boolean;
  ctaDisabled?: boolean;
}

export function BookingHero({ business, logoUrl, theme, isLoading = false, ctaDisabled = false }: BookingHeroProps) {
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
      {/* Full-width mobile logo banner */}
      {logoUrl && (
        <div className="sm:hidden w-full bg-white/95 flex items-center justify-center overflow-hidden">
          <img
            src={logoUrl}
            alt={`${business.name} logo`}
            className="w-full h-auto object-contain"
          />
        </div>
      )}

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "#fff" }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: "#fff" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-24">
        <div className="flex flex-col items-center text-center text-white">
          {/* Desktop logo */}
          {logoUrl ? (
            <div className="hidden sm:flex sm:w-auto sm:max-w-md mb-6 rounded-2xl shadow-2xl border-4 border-white/20 bg-white/95 p-3 items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt={`${business.name} logo`}
                className="w-full h-auto max-h-56 object-contain"
              />
            </div>
          ) : (
            <div
              className="w-40 h-40 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border-4 border-white/20"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Building2 className="w-20 h-20 text-white/80" />
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
            onClick={() => {
              const target = document.getElementById("booking-services");
              if (target) {
                const y = target.getBoundingClientRect().top + window.scrollY - 16;
                window.scrollTo({ top: y, behavior: "smooth" });
              } else {
                window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
              }
            }}
            disabled={isLoading || ctaDisabled}
            aria-busy={isLoading}
            className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-semibold text-base shadow-lg transition-all transform enabled:hover:shadow-xl enabled:hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#fff",
              color: primaryColor,
              fontFamily: fontBody,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : ctaDisabled ? (
              "No services available"
            ) : (
              "Book an Appointment"
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
