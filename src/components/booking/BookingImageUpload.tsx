import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface BookingImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  bookingId?: string;
}

export function BookingImageUpload({ images, onImagesChange, bookingId }: BookingImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${bookingId || "temp"}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `booking-photos/${fileName}`;

      const { error } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("business-assets")
        .getPublicUrl(filePath);

      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} image(s) uploaded`);
    }

    setUploading(false);
    event.target.value = "";
  };

  const handleRemove = (urlToRemove: string) => {
    onImagesChange(images.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-3">
      <Label>Photos</Label>
      
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Booking photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="relative"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4 mr-2" />
          )}
          {uploading ? "Uploading..." : "Add Photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </Button>
        <span className="text-xs text-muted-foreground">
          Max 5MB per image
        </span>
      </div>
    </div>
  );
}
