import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Images, Upload, Trash2, GripVertical, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  business_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

export function GalleryManagement() {
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (currentBusiness) {
      fetchImages();
    }
  }, [currentBusiness]);

  const fetchImages = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("business_id", currentBusiness.id)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching gallery images:", error);
      toast.error("Failed to load gallery");
    } else {
      setImages(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentBusiness) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 5MB`);
        }

        const fileExt = file.name.split(".").pop();
        const filePath = `gallery/${currentBusiness.id}/${Date.now()}-${index}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("business-assets")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("business-assets")
          .getPublicUrl(filePath);

        // Add to database
        const { error: dbError } = await supabase
          .from("gallery_images")
          .insert({
            business_id: currentBusiness.id,
            image_url: urlData.publicUrl,
            display_order: images.length + index,
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);
      toast.success(`${files.length} image(s) uploaded successfully`);
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload images");
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", imageId);

    if (error) {
      toast.error("Failed to delete image");
    } else {
      toast.success("Image deleted");
      setImages(images.filter((img) => img.id !== imageId));
    }
  };

  const handleEditSave = async () => {
    if (!editingImage) return;

    const { error } = await supabase
      .from("gallery_images")
      .update({
        title: editTitle || null,
        description: editDescription || null,
      })
      .eq("id", editingImage.id);

    if (error) {
      toast.error("Failed to update image");
    } else {
      toast.success("Image updated");
      fetchImages();
      setDialogOpen(false);
      setEditingImage(null);
    }
  };

  const openEditDialog = (image: GalleryImage) => {
    setEditingImage(image);
    setEditTitle(image.title || "");
    setEditDescription(image.description || "");
    setDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" />
            <CardTitle>Photo Gallery</CardTitle>
          </div>
          <div>
            <Label
              htmlFor="gallery-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Add Photos"}
            </Label>
            <input
              id="gallery-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>
        <CardDescription>
          Add photos to showcase your work on your public booking page
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Images className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No photos yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload photos to showcase your work
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={image.image_url}
                  alt={image.title || "Gallery image"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditDialog(image)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-sm font-medium truncate">
                      {image.title}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Image Details</DialogTitle>
              <DialogDescription>
                Add a title and description for this image
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingImage && (
                <img
                  src={editingImage.image_url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Before & After"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="gradient-primary">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
