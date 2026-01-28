import { useState } from "react";
import { Clock, DollarSign } from "lucide-react";
import { BookingFormModal } from "./BookingFormModal";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number;
  image_url: string | null;
  color: string | null;
}

interface PageTheme {
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

interface BookingServicesProps {
  services: Service[];
  theme: PageTheme | null;
  businessId: string;
}

export function BookingServices({ services, theme, businessId }: BookingServicesProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const primaryColor = theme?.primary_color || "#4F46E5";
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "Price varies";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price / 100);
  };

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: fontHeading }}
          >
            Our Services
          </h2>
          <p
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{ fontFamily: fontBody }}
          >
            Choose from our range of professional services
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Service Image or Color Header */}
              {service.image_url ? (
                <div className="h-40 overflow-hidden">
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: service.color || primaryColor }}
                />
              )}

              {/* Content */}
              <div className="p-5">
                <h3
                  className="text-lg font-semibold text-foreground mb-2"
                  style={{ fontFamily: fontHeading }}
                >
                  {service.name}
                </h3>

                {service.description && (
                  <p
                    className="text-muted-foreground text-sm mb-4 line-clamp-2"
                    style={{ fontFamily: fontBody }}
                  >
                    {service.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(service.duration_minutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatPrice(service.price)}
                    </span>
                  </div>
                </div>

                {/* Book Button */}
                <button
                  onClick={() => {
                    setSelectedService(service);
                    setBookingModalOpen(true);
                  }}
                  className="mt-4 w-full py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: primaryColor,
                    color: "#fff",
                    fontFamily: fontBody,
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {selectedService && (
        <BookingFormModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          businessId={businessId}
          service={selectedService}
          primaryColor={primaryColor}
        />
      )}
    </section>
  );
}
