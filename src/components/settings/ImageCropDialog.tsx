import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Info } from "lucide-react";


interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect?: number; // default 1 (square)
  outputSize?: number; // default 512
  title?: string;
  onCropComplete: (blob: Blob) => Promise<void> | void;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxOutputSize: number,
  forceSquare: boolean
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const srcW = Math.max(1, Math.round(pixelCrop.width));
  const srcH = Math.max(1, Math.round(pixelCrop.height));

  let outW: number;
  let outH: number;
  if (forceSquare) {
    outW = maxOutputSize;
    outH = maxOutputSize;
  } else {
    const scale = Math.min(1, maxOutputSize / Math.max(srcW, srcH));
    outW = Math.max(1, Math.round(srcW * scale));
    outH = Math.max(1, Math.round(srcH * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, srcW, srcH, 0, 0, outW, outH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/png",
      0.95
    );
  });
}


export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect = 1,
  outputSize = 512,
  title = "Edit Photo",
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shape, setShape] = useState<"square" | "wide" | "free">("square");
  const [autoDetected, setAutoDetected] = useState<"square" | "wide" | null>(null);
  const previewTimer = useRef<number | null>(null);

  const activeAspect =
    shape === "square" ? aspect : shape === "wide" ? 16 / 9 : undefined;
  const forceSquare = shape === "square" && aspect === 1;

  // Auto-detect best crop shape based on the source image aspect ratio
  useEffect(() => {
    if (!open || !imageSrc) return;
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(imageSrc);
        if (cancelled) return;
        const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
        // Wide logos (ratio > 1.4) → default to 16:9, otherwise square
        const next = ratio > 1.4 ? "wide" : "square";
        setShape(next);
        setAutoDetected(next);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [open, imageSrc]);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAreaPixels(null);
      setPreviewUrl(null);
      setAutoDetected(null);
    }
  }, [open, imageSrc]);


  const onCrop = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  // Generate a live preview (debounced) whenever the crop area changes
  useEffect(() => {
    if (!imageSrc || !areaPixels) return;
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(async () => {
      try {
        const image = await loadImage(imageSrc);
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(areaPixels.width, areaPixels.height));
        const w = Math.max(1, Math.round(areaPixels.width * scale));
        const h = Math.max(1, Math.round(areaPixels.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(
          image,
          areaPixels.x,
          areaPixels.y,
          areaPixels.width,
          areaPixels.height,
          0,
          0,
          w,
          h
        );
        setPreviewUrl(canvas.toDataURL("image/png"));
      } catch (e) {
        console.warn("Preview render failed", e);
      }
    }, 80);
    return () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
    };
  }, [imageSrc, areaPixels]);

  const handleSave = async () => {
    if (!imageSrc || !areaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, areaPixels, outputSize, forceSquare);
      await onCropComplete(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("Crop save error", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a shape, then drag to reposition. Zoom out to fit a wide logo, or zoom in to crop closer.
          </DialogDescription>
        </DialogHeader>

        {/* Shape selector */}
        <div className="flex flex-wrap gap-2">
          {([
            { id: "square", label: "Square" },
            { id: "wide", label: "Wide (16:9)" },
            { id: "free", label: "Free" },
          ] as const).map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={shape === opt.id ? "default" : "outline"}
              onClick={() => setShape(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full h-[55vh] sm:h-[480px] bg-muted rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.3}
              maxZoom={3}
              restrictPosition={false}
              aspect={activeAspect}
              cropShape="rect"
              showGrid
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCrop}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Zoom</Label>
          <Slider
            min={0.3}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>

        {/* Live preview at target sizes */}
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <div className="flex items-end justify-around gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex flex-col items-center gap-1.5">
              {previewUrl ? (
                <img src={previewUrl} alt="Favicon preview" className="w-8 h-8 rounded-sm object-cover border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-sm bg-muted" />
              )}
              <span className="text-[10px] text-muted-foreground">Favicon · 32px</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {previewUrl ? (
                <img src={previewUrl} alt="Header preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted" />
              )}
              <span className="text-[10px] text-muted-foreground">Header · 64px</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {previewUrl ? (
                <img src={previewUrl} alt="Full preview" className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-muted" />
              )}
              <span className="text-[10px] text-muted-foreground">Full · 128px</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !areaPixels}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
