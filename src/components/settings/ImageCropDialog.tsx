import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Info, AlertTriangle } from "lucide-react";


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
  const [zoomDraft, setZoomDraft] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [shape, setShape] = useState<"square" | "wide" | "free">("square");
  const [autoDetected, setAutoDetected] = useState<"square" | "wide" | null>(null);
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number } | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const cropFrameRef = useRef<number | null>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const pendingCropRef = useRef({ x: 0, y: 0 });
  const pendingZoomRef = useRef(1);

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
        loadedImageRef.current = img;
        setSourceDims({ w: img.naturalWidth, h: img.naturalHeight });
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
      setAutoDetected(null);
      setSourceDims(null);
      loadedImageRef.current = null;
      pendingCropRef.current = { x: 0, y: 0 };
      pendingZoomRef.current = 1;
    }
  }, [open, imageSrc]);

  // Resolution warnings based on source image + current crop area
  const MIN_SOURCE = 400; // minimum recommended shortest side of the source
  const RECOMMENDED_CROP = Math.min(outputSize, 512); // crop area shortest side
  const sourceTooSmall =
    !!sourceDims && Math.min(sourceDims.w, sourceDims.h) < MIN_SOURCE;
  const cropTooSmall =
    !!areaPixels &&
    Math.min(areaPixels.width, areaPixels.height) < RECOMMENDED_CROP;
  const showLowResWarning = sourceTooSmall || cropTooSmall;



  const onCrop = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleCropChange = useCallback((nextCrop: { x: number; y: number }) => {
    pendingCropRef.current = nextCrop;
    if (cropFrameRef.current !== null) return;
    cropFrameRef.current = window.requestAnimationFrame(() => {
      cropFrameRef.current = null;
      setCrop(pendingCropRef.current);
    });
  }, []);

  const handleZoomChange = useCallback((nextZoom: number) => {
    pendingZoomRef.current = nextZoom;
    if (zoomFrameRef.current !== null) return;
    zoomFrameRef.current = window.requestAnimationFrame(() => {
      zoomFrameRef.current = null;
      setZoom(pendingZoomRef.current);
    });
  }, []);

  const commitZoom = useCallback((nextZoom = zoomDraft) => {
    const safeZoom = Math.min(3, Math.max(0.3, nextZoom));
    setZoomDraft(safeZoom);
    handleZoomChange(safeZoom);
  }, [handleZoomChange, zoomDraft]);

  useEffect(() => {
    return () => {
      if (cropFrameRef.current !== null) window.cancelAnimationFrame(cropFrameRef.current);
      if (zoomFrameRef.current !== null) window.cancelAnimationFrame(zoomFrameRef.current);
    };
  }, []);

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
            We've picked the best shape for your image. Drag to reposition, use the slider to zoom, then Save.
          </DialogDescription>
        </DialogHeader>

        {/* Helper tip */}
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p><strong className="text-foreground">Square</strong> — best for icons, badges, and circular logos.</p>
            <p><strong className="text-foreground">Wide (16:9)</strong> — best for horizontal logos and wordmarks; fills the mobile booking banner.</p>
            <p><strong className="text-foreground">Free</strong> — keep the image's original proportions.</p>
          </div>
        </div>

        {/* Shape selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Shape</Label>
          <div className="flex flex-wrap gap-2">
            {([
              { id: "square", label: "Square (1:1)" },
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
                {autoDetected === opt.id && shape === opt.id && (
                  <span className="ml-1.5 text-[10px] opacity-70">· auto</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {showLowResWarning && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">This image may look blurry after cropping.</p>
              {sourceTooSmall && sourceDims && (
                <p>
                  Your file is only {sourceDims.w}×{sourceDims.h}px. For sharp results, upload an image at least {MIN_SOURCE}px on the shortest side (1000px+ recommended).
                </p>
              )}
              {cropTooSmall && !sourceTooSmall && areaPixels && (
                <p>
                  Your crop area is {Math.round(areaPixels.width)}×{Math.round(areaPixels.height)}px. Zoom out or pick a larger area to keep it crisp (aim for {RECOMMENDED_CROP}px+).
                </p>
              )}
            </div>
          </div>
        )}

        <div className="relative w-full h-[55vh] sm:h-[480px] bg-muted rounded-lg overflow-hidden">

          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.3}
              maxZoom={3}
              zoomWithScroll={false}
              restrictPosition={false}
              aspect={activeAspect}
              cropShape="rect"
              showGrid
              objectFit="contain"
              onCropChange={handleCropChange}
              onTouchRequest={(event) => event.touches.length < 2}
              onCropComplete={onCrop}
            />
          )}
        </div>


        <div className="space-y-2">
          <Label className="text-xs">Zoom</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => commitZoom(zoom - 0.1)}
              disabled={saving || zoom <= 0.3}
            >
              Smaller
            </Button>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.05"
              value={zoomDraft}
              onChange={(event) => setZoomDraft(Number(event.target.value))}
              onPointerUp={() => commitZoom()}
              onTouchEnd={() => commitZoom()}
              onKeyUp={() => commitZoom()}
              className="h-8 min-w-0 flex-1 cursor-pointer accent-primary"
              aria-label="Logo zoom"
              disabled={saving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => commitZoom(zoom + 0.1)}
              disabled={saving || zoom >= 3}
            >
              Larger
            </Button>
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
