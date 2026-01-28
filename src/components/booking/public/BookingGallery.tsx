import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

interface PageTheme {
  primary_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

interface BookingGalleryProps {
  images: GalleryImage[];
  theme: PageTheme | null;
}

export function BookingGallery({ images, theme }: BookingGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") closeLightbox();
  };

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: fontHeading }}
          >
            Our Work
          </h2>
          <p
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{ fontFamily: fontBody }}
          >
            Browse through our portfolio of work
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => openLightbox(index)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <img
                src={image.image_url}
                alt={image.title || "Gallery image"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium px-3 py-1 bg-black/50 rounded-full">
                  View
                </span>
              </div>
              {/* Title overlay */}
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                  <p
                    className="text-white text-sm font-medium truncate"
                    style={{ fontFamily: fontBody }}
                  >
                    {image.title}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Lightbox */}
        <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
          <DialogContent
            className="max-w-4xl w-full p-0 bg-black/95 border-0"
            onKeyDown={handleKeyDown}
          >
            {selectedIndex !== null && (
              <div className="relative">
                {/* Close button */}
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                  </>
                )}

                {/* Image */}
                <div className="flex items-center justify-center min-h-[60vh] p-8">
                  <img
                    src={images[selectedIndex].image_url}
                    alt={images[selectedIndex].title || "Gallery image"}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>

                {/* Image info */}
                {(images[selectedIndex].title || images[selectedIndex].description) && (
                  <div className="p-4 text-center">
                    {images[selectedIndex].title && (
                      <h3
                        className="text-white text-lg font-semibold mb-1"
                        style={{ fontFamily: fontHeading }}
                      >
                        {images[selectedIndex].title}
                      </h3>
                    )}
                    {images[selectedIndex].description && (
                      <p
                        className="text-white/70 text-sm"
                        style={{ fontFamily: fontBody }}
                      >
                        {images[selectedIndex].description}
                      </p>
                    )}
                  </div>
                )}

                {/* Image counter */}
                <div className="pb-4 text-center text-white/50 text-sm">
                  {selectedIndex + 1} / {images.length}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
