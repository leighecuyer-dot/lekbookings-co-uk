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

      <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-12 sm:pt-16 sm:pb-24">
        <div className="flex flex-col items-center text-center text-white">
          {/* Logo badge */}
          {logoUrl ? (
            <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl sm:rounded-3xl bg-white shadow-2xl border-4 border-white/30 flex items-center justify-center mb-6 overflow-hidden">
              <img
                src={logoUrl}
                alt={`${business.name} logo`}
                className="w-full h-full object-contain p-2 sm:p-3"
              />
            </div>
          ) : (
            /* Fallback icon when no logo */
            <div
              className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 shadow-2xl border-4 border-white/20"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Building2 className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-white/80" />
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
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                // Click the first "Book Now" button after the scroll
                setTimeout(() => {
                  const bookButtons = target.querySelectorAll<HTMLButtonElement>("button");
                  const bookNows = Array.from(bookButtons).filter(
                    (b) => b.textContent?.trim().toLowerCase() === "book now"
                  );
                  if (bookNows.length === 1) {
                    bookNows[0].click();
                  }
                }, 600);
              } else {
                window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
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
