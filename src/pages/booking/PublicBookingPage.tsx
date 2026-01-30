import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookingHero } from "@/components/booking/public/BookingHero";
import { BookingServices } from "@/components/booking/public/BookingServices";
import { BookingGallery } from "@/components/booking/public/BookingGallery";
import { BookingContact } from "@/components/booking/public/BookingContact";
import { BookingFooter } from "@/components/booking/public/BookingFooter";
import { FloatingWhatsApp } from "@/components/booking/public/FloatingWhatsApp";
import { Skeleton } from "@/components/ui/skeleton";

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  industry: string | null;
  settings?: {
    socialLinks?: SocialLinks;
  } | null;
}

interface PageTheme {
  id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

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

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [theme, setTheme] = useState<PageTheme | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  useEffect(() => {
    if (slug) {
      fetchBusinessData();
    }
  }, [slug]);

  const fetchBusinessData = async () => {
    if (!slug) return;

    setLoading(true);
    
    // Fetch business by slug - this is a public query
    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, slug, phone, email, address, logo_url, industry, settings")
      .eq("slug", slug)
      .maybeSingle();

    if (businessError || !businessData) {
      console.error("Business not found:", businessError);
      setNotFound(true);
      setLoading(false);
      return;
    }

    setBusiness({
      ...businessData,
      settings: businessData.settings as Business["settings"],
    });

    // Fetch theme, services, categories, and gallery in parallel
    const [themeResult, servicesResult, categoriesResult, galleryResult] = await Promise.all([
      supabase
        .from("page_themes")
        .select("*")
        .eq("business_id", businessData.id)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, image_url, color, category_id")
        .eq("business_id", businessData.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("service_categories")
        .select("id, name, description, display_order")
        .eq("business_id", businessData.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("gallery_images")
        .select("id, image_url, title, description, display_order")
        .eq("business_id", businessData.id)
        .order("display_order", { ascending: true }),
    ]);

    if (themeResult.data) setTheme(themeResult.data);
    if (servicesResult.data) setServices(servicesResult.data);
    if (categoriesResult.data) setCategories(categoriesResult.data);
    if (galleryResult.data) setGallery(galleryResult.data);

    setLoading(false);
  };

  // Generate CSS variables from theme
  const themeStyles = theme ? {
    "--booking-primary": theme.primary_color || "#4F46E5",
    "--booking-secondary": theme.secondary_color || "#06B6D4",
    "--booking-accent": theme.accent_color || "#F59E0B",
    "--booking-font-heading": theme.font_heading || "Plus Jakarta Sans",
    "--booking-font-body": theme.font_body || "Inter",
  } as React.CSSProperties : {};

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full mb-8 rounded-2xl" />
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Business Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The booking page you're looking for doesn't exist or has been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const logoUrl = theme?.logo_url || business.logo_url;
  const whatsappNumber = business.settings?.socialLinks?.whatsapp;

  return (
    <div
      className="min-h-screen bg-background"
      style={themeStyles}
    >
      <BookingHero
        business={business}
        logoUrl={logoUrl}
        theme={theme}
      />
      
      {services.length > 0 && (
        <BookingServices
          services={services}
          categories={categories}
          theme={theme}
          businessId={business.id}
        />
      )}
      
      {gallery.length > 0 && (
        <BookingGallery
          images={gallery}
          theme={theme}
        />
      )}
      
      <BookingContact
        business={business}
        theme={theme}
      />
      
      <BookingFooter
        business={business}
      />

      {whatsappNumber && (
        <FloatingWhatsApp 
          phoneNumber={whatsappNumber} 
          businessName={business.name}
        />
      )}
    </div>
  );
}
