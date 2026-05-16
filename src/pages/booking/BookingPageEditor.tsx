import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ThemeCustomization } from "@/components/settings/ThemeCustomization";
import { GalleryManagement } from "@/components/settings/GalleryManagement";
import { SocialLinksSettings } from "@/components/settings/SocialLinksSettings";
import { EmbedWidget } from "@/components/settings/EmbedWidget";
import { SlugEditor } from "@/components/settings/SlugEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Eye, Globe } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";

export default function BookingPageEditor() {
  const { currentBusiness } = useBusiness();

  const bookingUrl = currentBusiness
    ? `${window.location.origin}/book/${currentBusiness.slug}`
    : "";

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success("Booking link copied!");
  };

  return (
    <DashboardLayout
      title="Booking Page"
      description="Customise what your customers see when they visit your booking page"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyBookingUrl}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button asChild>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              Preview Page
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-6">
        {/* Your booking link */}
        <Card className="border-0 shadow-soft bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-primary" />
              Your Booking Link
            </CardTitle>
            <CardDescription>
              Share this link with customers so they can view your services and book online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={bookingUrl}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button variant="outline" size="icon" onClick={copyBookingUrl}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme / Branding */}
        <ThemeCustomization />

        {/* Gallery */}
        <GalleryManagement />

        {/* Social Links */}
        <SocialLinksSettings />

        {/* Embed Widget */}
        <EmbedWidget />
      </div>
    </DashboardLayout>
  );
}
