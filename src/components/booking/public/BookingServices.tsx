import { useState, useMemo } from "react";
import { Clock, DollarSign, Search } from "lucide-react";
import { BookingFormModal } from "./BookingFormModal";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number;
  image_url: string | null;
  color: string | null;
  category_id: string | null;
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
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
  categories: ServiceCategory[];
  theme: PageTheme | null;
  businessId: string;
}

export function BookingServices({ services, categories, theme, businessId }: BookingServicesProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const primaryColor = theme?.primary_color || "#4F46E5";
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        !searchQuery.trim() ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory =
        selectedCategoryId === null || service.category_id === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategoryId]);

  // Group services by category
  const groupedServices = useMemo(() => {
    if (selectedCategoryId !== null) {
      return [{ category: null, services: filteredServices }];
    }

    const uncategorized: Service[] = [];
    const byCategory = new Map<string, { category: ServiceCategory; services: Service[] }>();

    filteredServices.forEach((service) => {
      if (!service.category_id) {
        uncategorized.push(service);
      } else {
        const category = categories.find((c) => c.id === service.category_id);
        if (category) {
          const existing = byCategory.get(service.category_id);
          if (existing) {
            existing.services.push(service);
          } else {
            byCategory.set(service.category_id, { category, services: [service] });
          }
        } else {
          uncategorized.push(service);
        }
      }
    });

    const result: { category: ServiceCategory | null; services: Service[] }[] = [];

    // Sort by category display_order
    const sortedCategories = Array.from(byCategory.values()).sort(
      (a, b) => a.category.display_order - b.category.display_order
    );

    sortedCategories.forEach((group) => result.push(group));

    if (uncategorized.length > 0) {
      result.push({ category: null, services: uncategorized });
    }

    return result;
  }, [filteredServices, categories, selectedCategoryId]);

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
        <div className="text-center mb-8">
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

        {/* Search Bar */}
        {services.length > 3 && (
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
                style={{
                  fontFamily: fontBody,
                  // @ts-ignore
                  "--tw-ring-color": primaryColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategoryId === null
                  ? "text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              style={{
                backgroundColor: selectedCategoryId === null ? primaryColor : undefined,
                fontFamily: fontBody,
              }}
            >
              All Services
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategoryId === category.id
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={{
                  backgroundColor: selectedCategoryId === category.id ? primaryColor : undefined,
                  fontFamily: fontBody,
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground"
            style={{ fontFamily: fontBody }}
          >
            No services found matching your filters
          </div>
        ) : (
          <div className="space-y-10">
            {groupedServices.map((group) => (
              <div key={group.category?.id || "uncategorized"}>
                {group.category && (
                  <div className="mb-6 text-center">
                    <h3
                      className="text-xl font-semibold text-foreground"
                      style={{ fontFamily: fontHeading }}
                    >
                      {group.category.name}
                    </h3>
                    {group.category.description && (
                      <p
                        className="text-muted-foreground text-sm mt-1"
                        style={{ fontFamily: fontBody }}
                      >
                        {group.category.description}
                      </p>
                    )}
                  </div>
                )}
                {!group.category && categories.length > 0 && groupedServices.length > 1 && (
                  <h3
                    className="text-xl font-semibold text-muted-foreground mb-6 text-center"
                    style={{ fontFamily: fontHeading }}
                  >
                    Other Services
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.services.map((service) => (
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
            ))}
          </div>
        )}
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
