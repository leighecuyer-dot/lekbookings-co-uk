import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PinchZoomWrapperProps {
  children: ReactNode;
  min?: number;
  max?: number;
  storageKey?: string;
}

/**
 * Wraps content with pinch-to-zoom (two-finger touch) plus +/- buttons.
 * Uses CSS transform: scale to keep all click/drag handlers working.
 * Sizes the outer box so parent scrollbars stay accurate.
 */
export function PinchZoomWrapper({
  children,
  min = 0.6,
  max = 2.5,
  storageKey = "lek-calendar-zoom",
}: PinchZoomWrapperProps) {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const saved = parseFloat(localStorage.getItem(storageKey) || "1");
    return Number.isFinite(saved) && saved >= min && saved <= max ? saved : 1;
  });
  const [innerHeight, setInnerHeight] = useState<number>(0);

  const innerRef = useRef<HTMLDivElement>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  // Persist zoom
  useEffect(() => {
    localStorage.setItem(storageKey, scale.toString());
  }, [scale, storageKey]);

  // Track inner content size so outer wrapper sizes correctly
  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setInnerHeight(entry.contentRect.height);
      }
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = { dist: Math.hypot(dx, dy), scale };
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = clamp((dist / pinchStart.current.dist) * pinchStart.current.scale);
      setScale(next);
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStart.current = null;
  }, []);

  return (
    <div className="relative h-full">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 bg-background/90 backdrop-blur rounded-lg border-2 border-foreground p-1 shadow-md">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setScale((s) => clamp(s + 0.1))}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setScale((s) => clamp(s - 0.1))}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setScale(1)}
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: "100%",
          height: innerHeight ? `${innerHeight * scale}px` : "auto",
          touchAction: "pan-x pan-y",
        }}
      >
        <div
          ref={innerRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${100 / scale}%`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
