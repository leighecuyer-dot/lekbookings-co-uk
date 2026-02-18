import { Card, CardContent } from "@/components/ui/card";
import { Clock, PoundSterling, GripVertical } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
}

interface ServiceCardOverlayProps {
  service: Service;
}

export function ServiceCardOverlay({ service }: ServiceCardOverlayProps) {
  return (
    <Card className="border-0 shadow-2xl rotate-3 scale-105 opacity-95 cursor-grabbing">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div className="mt-1 p-1 rounded bg-muted">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Color indicator */}
          <div
            className="w-3 h-full min-h-[60px] rounded-full shrink-0"
            style={{ backgroundColor: service.color || "#3B82F6" }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium truncate">{service.name}</h3>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {service.duration_minutes} min
              </span>
              {service.price && (
                <span className="text-sm font-medium flex items-center gap-1">
                  <PoundSterling className="w-3 h-3" />
                  {service.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
